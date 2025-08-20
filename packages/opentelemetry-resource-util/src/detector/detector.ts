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

import {
  CLOUD_PLATFORM_VALUE_GCP_APP_ENGINE,
  CLOUD_PLATFORM_VALUE_GCP_CLOUD_FUNCTIONS,
  CLOUD_PLATFORM_VALUE_GCP_CLOUD_RUN,
  CLOUD_PLATFORM_VALUE_GCP_COMPUTE_ENGINE,
  CLOUD_PLATFORM_VALUE_GCP_KUBERNETES_ENGINE,
  CLOUD_PROVIDER_VALUE_GCP,
  ATTR_CLOUD_ACCOUNT_ID,
  ATTR_CLOUD_AVAILABILITY_ZONE,
  ATTR_CLOUD_PLATFORM,
  ATTR_CLOUD_PROVIDER,
  ATTR_CLOUD_REGION,
  ATTR_FAAS_INSTANCE,
  ATTR_FAAS_NAME,
  ATTR_FAAS_VERSION,
  ATTR_HOST_ID,
  ATTR_HOST_NAME,
  ATTR_HOST_TYPE,
  ATTR_K8S_CLUSTER_NAME,
} from '@opentelemetry/semantic-conventions/incubating';

import {
  DetectedResource,
  DetectedResourceAttributes,
  ResourceDetector,
} from '@opentelemetry/resources';
import * as metadata from 'gcp-metadata';
import * as faas from './faas';
import * as gae from './gae';
import * as gce from './gce';
import * as gke from './gke';

function detect(): DetectedResourceAttributes {
  // if (!(await metadata.isAvailable())) {
  //   return {};
  // }

  // Note the order of these if checks is significant with more specific resources coming
  // first. E.g. Cloud Functions gen2 are executed in Cloud Run so it must be checked first.
  let attributes: DetectedResourceAttributes;
  if (gke.onGke()) {
    attributes = gkeResource();
  } else if (faas.onCloudFunctions()) {
    attributes = cloudFunctionsResource();
  } else if (faas.onCloudRun()) {
    attributes = cloudRunResource();
  } else if (gae.onAppEngine()) {
    attributes = gaeResource();
  } else {
    // assume on GCE or these will resolve to undefined
    attributes = gceResource();
  }

  return {...commonAttributes(), ...attributes};
}

function gkeResource(): DetectedResourceAttributes {
  const zoneOrRegion = gke.availabilityZoneOrRegion();
  const zone = zoneOrRegion.then(({type, value}) =>
    type === 'zone' ? value : undefined
  );
  const region = zoneOrRegion.then(({type, value}) =>
    type === 'region' ? value : undefined
  );

  return {
    [ATTR_CLOUD_PLATFORM]: CLOUD_PLATFORM_VALUE_GCP_KUBERNETES_ENGINE,
    [ATTR_CLOUD_AVAILABILITY_ZONE]: zone,
    [ATTR_CLOUD_REGION]: region,
    [ATTR_K8S_CLUSTER_NAME]: gke.clusterName(),
    [ATTR_HOST_ID]: gke.hostId(),
  };
}

function cloudRunResource(): DetectedResourceAttributes {
  return {
    [ATTR_CLOUD_PLATFORM]: CLOUD_PLATFORM_VALUE_GCP_CLOUD_RUN,
    [ATTR_FAAS_NAME]: faas.faasName(),
    [ATTR_FAAS_VERSION]: faas.faasVersion(),
    [ATTR_FAAS_INSTANCE]: faas.faasInstance(),
    [ATTR_CLOUD_REGION]: faas.faasCloudRegion(),
  };
}

function cloudFunctionsResource(): DetectedResourceAttributes {
  return {
    [ATTR_CLOUD_PLATFORM]: CLOUD_PLATFORM_VALUE_GCP_CLOUD_FUNCTIONS,
    [ATTR_FAAS_NAME]: faas.faasName(),
    [ATTR_FAAS_VERSION]: faas.faasVersion(),
    [ATTR_FAAS_INSTANCE]: faas.faasInstance(),
    [ATTR_CLOUD_REGION]: faas.faasCloudRegion(),
  };
}

function gaeResource(): DetectedResourceAttributes {
  let zone, region;
  if (gae.onAppEngineStandard()) {
    zone = gae.standardAvailabilityZone();
    region = gae.standardCloudRegion();
  } else {
    // TODO: Is this right?? or should be  flexAvailabilityZoneAndRegion()
    const zoneAndRegion = gce.availabilityZoneAndRegion();
    zone = zoneAndRegion.then(({zone}) => zone);
    region = zoneAndRegion.then(({region}) => region);
  }

  return {
    [ATTR_CLOUD_PLATFORM]: CLOUD_PLATFORM_VALUE_GCP_APP_ENGINE,
    [ATTR_FAAS_NAME]: gae.serviceName(),
    [ATTR_FAAS_VERSION]: gae.serviceVersion(),
    [ATTR_FAAS_INSTANCE]: gae.serviceInstance(),
    [ATTR_CLOUD_AVAILABILITY_ZONE]: zone,
    [ATTR_CLOUD_REGION]: region,
  };
}

function gceResource(): DetectedResourceAttributes {
  const zoneAndRegion = gce.availabilityZoneAndRegion();
  const zone = zoneAndRegion.then(({zone}) => zone);
  const region = zoneAndRegion.then(({region}) => region);

  return {
    [ATTR_CLOUD_PLATFORM]: CLOUD_PLATFORM_VALUE_GCP_COMPUTE_ENGINE,
    [ATTR_CLOUD_AVAILABILITY_ZONE]: zone,
    [ATTR_CLOUD_REGION]: region,
    [ATTR_HOST_TYPE]: gce.hostType(),
    [ATTR_HOST_ID]: gce.hostId(),
    [ATTR_HOST_NAME]: gce.hostName(),
  };
}

function commonAttributes(): DetectedResourceAttributes {
  const provider = metadata
    .isAvailable()
    .then(isAvailable => (isAvailable ? CLOUD_PROVIDER_VALUE_GCP : undefined));

  return {
    [ATTR_CLOUD_PROVIDER]: provider,
    [ATTR_CLOUD_ACCOUNT_ID]: metadata.project<string>('project-id'),
  };
}

/**
 * Google Cloud resource detector which populates attributes based on the environment this
 * process is running in. If not on GCP, returns an empty resource.
 */
export class GcpDetectorSync implements ResourceDetector {
  detect(): DetectedResource {
    return {
      attributes: detect(),
    };
  }
}
