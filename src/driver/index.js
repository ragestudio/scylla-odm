/*
 * Licensed to the Apache Software Foundation (ASF) under one
 * or more contributor license agreements.  See the NOTICE file
 * distributed with this work for additional information
 * regarding copyright ownership.  The ASF licenses this file
 * to you under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License.  You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
import clientOptions from "./lib/client-options"
import Client from "./lib/client"
import { ExecutionProfile } from "./lib/execution-profile"
import { ExecutionOptions } from "./lib/execution-options"
import types from "./lib/types"
import errors from "./lib/errors"
import policies from "./lib/policies"
import auth from "./lib/auth"
import mapping from "./lib/mapping"
import tracker from "./lib/tracker"
import metrics from "./lib/metrics"
import concurrent from "./lib/concurrent"
import { Token, TokenRange } from "./lib/token"
import Metadata from "./lib/metadata"
import Encoder from "./lib/encoder"
import geometry from "./lib/geometry"
import { version as pkgVersion } from "../../package.json" with { type: "json" }

export {
	Client,
	ExecutionProfile,
	ExecutionOptions,
	types,
	errors,
	policies,
	auth,
	mapping,
	tracker,
	metrics,
	concurrent,
	Encoder,
	geometry,
}

export const token = {
	Token: Token,
	TokenRange: TokenRange,
}

export const metadata = {
	Metadata: Metadata,
}

/**
 * Returns a new instance of the default [options]{@link ClientOptions} used by the driver.
 */
export function defaultOptions() {
	return clientOptions.defaultOptions()
}

export const version = pkgVersion

const _default = {
	Client,
	ExecutionProfile,
	ExecutionOptions,
	types,
	errors,
	policies,
	auth,
	mapping,
	tracker,
	metrics,
	concurrent,
	token,
	metadata,
	Encoder,
	geometry,
	defaultOptions,
	version,
}

export default _default
