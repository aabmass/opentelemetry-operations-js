const core = require("@opentelemetry/core");

async function main() {
  const start = process.hrtime();
  const end = await new Promise((resolve) => {
    setTimeout(() => resolve(process.hrtime()), 100);
  });
  const dur = core.hrTimeDuration(start, end);
  console.log(dur);
  console.log("Millis diff: %s", core.hrTimeToMilliseconds(dur));
}
main();
