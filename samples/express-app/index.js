// Copyright 2022 Google LLC
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      https://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

const {
  PeriodicExportingMetricReader,
  View,
  InstrumentType,
  ExponentialHistogramAggregation,
  MetricReader,
} = require("@opentelemetry/sdk-metrics");
const { Resource } = require("@opentelemetry/resources");
const {
  MetricExporter,
} = require("@google-cloud/opentelemetry-cloud-monitoring-exporter");
const {
  TraceExporter,
} = require("@google-cloud/opentelemetry-cloud-trace-exporter");
const {
  GcpDetectorSync,
} = require("@google-cloud/opentelemetry-resource-util");
const { NodeSDK } = require("@opentelemetry/sdk-node");
const { HttpInstrumentation } = require("@opentelemetry/instrumentation-http");
const {
  ExpressInstrumentation,
} = require("@opentelemetry/instrumentation-express");
const api = require("@opentelemetry/api");
const { hrTimeDuration } = require("@opentelemetry/core");

// Create MeterProvider
const sdk = new NodeSDK({
  // Create a resource. Fill the `service.*` attributes in with real values for your service.
  // GcpDetectorSync will add in resource information about the current environment if you are
  // running on GCP. These resource attributes will be translated to a specific GCP monitored
  // resource if running on GCP. Otherwise, metrics will be sent with monitored resource
  // `generic_task`.
  resource: new Resource({
    "service.name": "example-metric-service",
    "service.namespace": "samples",
    "service.instance.id": "12345",
  }),
  resourceDetectors: [new GcpDetectorSync()],
  views: [
    new View({
      instrumentType: InstrumentType.HISTOGRAM,
      aggregation: new ExponentialHistogramAggregation(80),
    }),
  ],
  metricReader: new PeriodicExportingMetricReader({
    // Export metrics every 10 seconds. 5 seconds is the smallest sample period allowed by
    // Cloud Monitoring.
    exportIntervalMillis: 10_000,
    exporter: new MetricExporter(),
  }),
  // traceExporter: new TraceExporter(),
  instrumentations: [
    // Express instrumentation expects HTTP layer to be instrumented
    new HttpInstrumentation(),
    new ExpressInstrumentation(),
  ],
});
sdk.start();

const express = require("express");
const serveIndex = require("serve-index");
const app = express();
const port = 3000;

// Serve static files from this directory
app.use(serveIndex("."), express.static("."));

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});
