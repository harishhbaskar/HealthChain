#!/bin/bash

# ═══════════════════════════════════════════════════════════════════════════════
#  HealthChain - SQL Injection / Tamper Detection Demo Tool
# ═══════════════════════════════════════════════════════════════════════════════

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
WHITE='\033[1;37m'
NC='\033[0m' # No Color

# Config
MYSQL_CONTAINER=$(docker ps -qf "ancestor=mysql" | head -1)
DB_USER="root"
DB_PASS="root123"
DB_NAME="healthchain_db"
API_URL="${API_URL:-http://localhost:3000/api}"

# Curl helper: allow self-signed local certs when using HTTPS
curl_api() {
    local method=$1
    local url=$2
    local data=$3

    if [[ "$url" == https://* ]]; then
        if [ -n "$data" ]; then
            curl -s -k -X "$method" "$url" -H "Content-Type: application/json" -d "$data"
        else
            curl -s -k -X "$method" "$url"
        fi
    else
        if [ -n "$data" ]; then
            curl -s -X "$method" "$url" -H "Content-Type: application/json" -d "$data"
        else
            curl -s -X "$method" "$url"
        fi
    fi
}

# Get a fresh token
get_token() {
    local payload='{"username":"dr_house","password":"password123"}'
    local response

    response=$(curl_api "POST" "$API_URL/login" "$payload")
    local token
    token=$(echo "$response" | grep -o '"token":"[^"]*"' | cut -d'"' -f4)

    # If HTTP endpoint redirects badly (301 on POST), retry direct HTTPS API.
    if [ -z "$token" ] && [ "$API_URL" = "http://localhost:3000/api" ]; then
        API_URL="https://localhost:3443/api"
        response=$(curl_api "POST" "$API_URL/login" "$payload")
        token=$(echo "$response" | grep -o '"token":"[^"]*"' | cut -d'"' -f4)
    fi

    echo "$token"
}

TOKEN=$(get_token)

# MySQL query helper
mysql_query() {
    docker exec -i $MYSQL_CONTAINER mysql -u$DB_USER -p$DB_PASS $DB_NAME -e "$1" 2>/dev/null
}

# Clear screen and show header
show_header() {
    clear
    echo -e "${CYAN}"
    echo "╔══════════════════════════════════════════════════════════════════════════════╗"
    echo "║       🔓 HealthChain - SQL Injection / Tamper Detection Demo Tool 🔓         ║"
    echo "╚══════════════════════════════════════════════════════════════════════════════╝"
    echo -e "${NC}"
}

# Show available records
show_records() {
    echo -e "${WHITE}📋 Available Medical Records:${NC}"
    echo ""
    mysql_query "
    SELECT
        v.id AS 'Visit#',
        CONCAT(p.first_name, ' ', p.last_name) AS 'Patient',
        LEFT(v.chief_complaint, 40) AS 'Chief Complaint',
        d.condition_name AS 'Diagnosis',
        CASE
            WHEN v.record_hash IS NOT NULL THEN '✓ Hashed'
            ELSE '✗ No Hash'
        END AS 'Status'
    FROM visits v
    JOIN patients p ON p.id = v.patient_id
    LEFT JOIN diagnoses d ON d.visit_id = v.id
    ORDER BY v.id DESC
    LIMIT 10;
    "
}

# Show record details
show_record_details() {
    local visit_id=$1
    echo -e "\n${WHITE}📄 Record #$visit_id Details:${NC}\n"
    mysql_query "
    SELECT
        'Chief Complaint' AS Field, v.chief_complaint AS Value FROM visits v WHERE v.id = $visit_id
    UNION ALL
    SELECT 'Blood Pressure', vt.blood_pressure FROM vitals vt WHERE vt.visit_id = $visit_id
    UNION ALL
    SELECT 'Heart Rate', CAST(vt.heart_rate AS CHAR) FROM vitals vt WHERE vt.visit_id = $visit_id
    UNION ALL
    SELECT 'Temperature', CAST(vt.temperature AS CHAR) FROM vitals vt WHERE vt.visit_id = $visit_id
    UNION ALL
    SELECT 'Diagnosis', d.condition_name FROM diagnoses d WHERE d.visit_id = $visit_id
    UNION ALL
    SELECT 'Severity', d.severity FROM diagnoses d WHERE d.visit_id = $visit_id
    UNION ALL
    SELECT 'Medication', p.medication_name FROM prescriptions p WHERE p.visit_id = $visit_id
    UNION ALL
    SELECT 'Instructions', LEFT(p.instructions, 60) FROM prescriptions p WHERE p.visit_id = $visit_id;
    "
}

# Verify record integrity
verify_record() {
    local visit_id=$1
    echo -e "\n${WHITE}🔍 Verifying Record #$visit_id...${NC}"

    if [[ "$API_URL" == https://* ]]; then
        result=$(curl -s -k "$API_URL/verify/$visit_id" -H "Authorization: Bearer $TOKEN")
    else
        result=$(curl -s "$API_URL/verify/$visit_id" -H "Authorization: Bearer $TOKEN")
    fi
    status=$(echo $result | grep -o '"status":"[^"]*"' | cut -d'"' -f4)

    if [ "$status" == "SECURE" ]; then
        echo -e "${GREEN}╔════════════════════════════════════╗${NC}"
        echo -e "${GREEN}║     ✅ VERIFIED SECURE             ║${NC}"
        echo -e "${GREEN}║  Hash matches blockchain record    ║${NC}"
        echo -e "${GREEN}╚════════════════════════════════════╝${NC}"
    else
        echo -e "${RED}╔════════════════════════════════════╗${NC}"
        echo -e "${RED}║     ❌ TAMPER DETECTED!            ║${NC}"
        echo -e "${RED}║  Data has been modified!           ║${NC}"
        echo -e "${RED}╚════════════════════════════════════╝${NC}"
    fi
}

# Attack menu
attack_menu() {
    local visit_id=$1

    echo -e "\n${YELLOW}⚔️  SELECT FIELD TO ATTACK:${NC}"
    echo ""
    echo "  1) Chief Complaint  (visits.chief_complaint)"
    echo "  2) Blood Pressure   (vitals.blood_pressure)"
    echo "  3) Heart Rate       (vitals.heart_rate)"
    echo "  4) Temperature      (vitals.temperature)"
    echo "  5) Diagnosis        (diagnoses.condition_name)"
    echo "  6) Severity         (diagnoses.severity)"
    echo "  7) Medication       (prescriptions.medication_name)"
    echo "  8) Instructions     (prescriptions.instructions)"
    echo "  0) Back to main menu"
    echo ""
    read -p "Select field [1-8]: " field_choice

    case $field_choice in
        1) attack_field "visits" "chief_complaint" $visit_id ;;
        2) attack_field "vitals" "blood_pressure" $visit_id ;;
        3) attack_field "vitals" "heart_rate" $visit_id ;;
        4) attack_field "vitals" "temperature" $visit_id ;;
        5) attack_field "diagnoses" "condition_name" $visit_id ;;
        6) attack_field "diagnoses" "severity" $visit_id ;;
        7) attack_field "prescriptions" "medication_name" $visit_id ;;
        8) attack_field "prescriptions" "instructions" $visit_id ;;
        0) return ;;
        *) echo -e "${RED}Invalid choice${NC}" ;;
    esac
}

# Execute attack on a field
attack_field() {
    local table=$1
    local field=$2
    local visit_id=$3

    # Get current value
    if [ "$table" == "visits" ]; then
        current=$(mysql_query "SELECT $field FROM $table WHERE id = $visit_id;" | tail -1)
    else
        current=$(mysql_query "SELECT $field FROM $table WHERE visit_id = $visit_id;" | tail -1)
    fi

    echo -e "\n${CYAN}Current value:${NC} $current"
    echo ""
    echo -e "${YELLOW}Enter new malicious value (or press Enter for default 'HACKED!'):${NC}"
    read -p "> " new_value

    if [ -z "$new_value" ]; then
        new_value="HACKED BY SQL INJECTION!"
    fi

    echo -e "\n${RED}🔥 EXECUTING SQL INJECTION ATTACK...${NC}"
    echo -e "${WHITE}   UPDATE $table SET $field = '$new_value' WHERE visit_id = $visit_id${NC}"

    # Store original for restore
    echo "$table|$field|$visit_id|$current" >> /tmp/tamper_restore_$visit_id.txt

    # Execute attack
    if [ "$table" == "visits" ]; then
        mysql_query "UPDATE $table SET $field = '$new_value' WHERE id = $visit_id;"
    else
        mysql_query "UPDATE $table SET $field = '$new_value' WHERE visit_id = $visit_id;"
    fi

    echo -e "${RED}✓ Database modified!${NC}"

    # Verify to show tampering detected
    sleep 1
    verify_record $visit_id

    echo ""
    read -p "Press Enter to continue..."
}

# Restore record
restore_record() {
    local visit_id=$1

    if [ ! -f "/tmp/tamper_restore_$visit_id.txt" ]; then
        echo -e "${YELLOW}No backup found for Visit #$visit_id${NC}"
        return
    fi

    echo -e "\n${GREEN}🔄 Restoring original values...${NC}"

    while IFS='|' read -r table field vid value; do
        if [ "$table" == "visits" ]; then
            mysql_query "UPDATE $table SET $field = '$value' WHERE id = $vid;"
        else
            mysql_query "UPDATE $table SET $field = '$value' WHERE visit_id = $vid;"
        fi
        echo -e "  Restored $table.$field"
    done < /tmp/tamper_restore_$visit_id.txt

    rm -f /tmp/tamper_restore_$visit_id.txt

    echo -e "${GREEN}✓ Record restored!${NC}"
    verify_record $visit_id

    read -p "Press Enter to continue..."
}

# Main menu
main_menu() {
    while true; do
        show_header
        show_records

        echo -e "\n${WHITE}═══════════════════════════════════════════════════════════════════════════════${NC}"
        echo -e "${WHITE}ACTIONS:${NC}"
        echo "  [1-99] Enter Visit# to attack"
        echo "  [v]    Verify a record"
        echo "  [q]    Quit"
        echo ""
        read -p "Choice: " choice

        case $choice in
            q|Q)
                echo -e "\n${CYAN}Goodbye!${NC}\n"
                exit 0
                ;;
            v|V)
                read -p "Enter Visit# to verify: " vid
                verify_record $vid
                read -p "Press Enter to continue..."
                ;;
            r|R)
                read -p "Enter Visit# to restore: " vid
                restore_record $vid
                ;;
            [0-9]*)
                # Check if valid visit
                exists=$(mysql_query "SELECT COUNT(*) FROM visits WHERE id = $choice;" | tail -1)
                if [ "$exists" -gt 0 ]; then
                    show_header
                    show_record_details $choice
                    verify_record $choice
                    attack_menu $choice
                else
                    echo -e "${RED}Visit #$choice not found${NC}"
                    read -p "Press Enter to continue..."
                fi
                ;;
            *)
                echo -e "${RED}Invalid choice${NC}"
                sleep 1
                ;;
        esac
    done
}

# Check dependencies
check_deps() {
    if [ -z "$MYSQL_CONTAINER" ]; then
        echo -e "${RED}Error: MySQL container not found!${NC}"
        echo "Make sure Docker is running with your MySQL container."
        exit 1
    fi

    if [ -z "$TOKEN" ]; then
        echo -e "${RED}Error: Could not get auth token!${NC}"
        echo "Make sure the backend server is running on port 3000."
        exit 1
    fi
}

# Run
check_deps
main_menu
