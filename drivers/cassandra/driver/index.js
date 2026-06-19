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
import clientOptions from "./client-options"
import Client from "./client"
import { ExecutionProfile } from "./execution-profile"
import { ExecutionOptions } from "./execution-options"
import types from "./types"
import errors from "./errors"
import policies from "./policies"
import auth from "./auth"
import mapping from "./mapping"
import concurrent from "./concurrent"
import { Token, TokenRange } from "./token"
import Metadata from "./metadata"
import Encoder from "./encoder"
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
	concurrent,
	token,
	metadata,
	Encoder,
	defaultOptions,
	version,
}

export default _default
