function outer() {
  let count = 0;

  function inner() {
    console.log('Inner function executed');
    count++;
    console.log(`Inner count: ${count}`);
  }
  console.log('Outer function executed');
  return inner;
}

const fn = outer();
fn();
fn();