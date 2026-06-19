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
import clientOptions from "./client-options.js"
import Client from "./client.js"
import { ExecutionProfile } from "./execution-profile.js"
import { ExecutionOptions } from "./execution-options.js"
import types from "./types/index.js"
import errors from "./errors.js"
import policies from "./policies/index.js"
import auth from "./auth/index.js"
import mapping from "./mapping/index.js"
import concurrent from "./concurrent/index.js"
import { Token, TokenRange } from "./token.js"
import Metadata from "./metadata/index.js"
import Encoder from "./encoder.js"

export {
	Client,
	ExecutionProfile,
	ExecutionOptions,
	types,
	errors,
	policies,
	auth,
	mapping,
	concurrent,
	Encoder,
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

const _default = {
	Client,
	ExecutionProfile,
	ExecutionOptions,
	types,
	errors,
	policies,
	auth,
	mapping,
	concurrent,
	token,
	metadata,
	Encoder,
	defaultOptions,
}

export default _default
