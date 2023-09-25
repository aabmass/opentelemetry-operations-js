const { hrTime } = require("@opentelemetry/core");

function check(t) {
  if (!Number.isInteger(t[0]) || !Number.isInteger(t[1])) {
    throw new RangeError(
      `Got non-int hrTime: ${t}, timeorigin=${
        performance.timeOrigin
      }, now=${performance.now()}`
    );
  }
}

for (let i = 0; i < 50_000; ++i) {
  const t = hrTime();
  console.log(t, performance.now());
  check(t);
}
