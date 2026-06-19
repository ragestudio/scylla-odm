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

/**
 * Contains driver tuning policies to determine [load balancing]{@link module:policies/loadBalancing},
 *  [retrying]{@link module:policies/retry} queries, [reconnecting]{@link module:policies/reconnection} to a node,
 *  [address resolution]{@link module:policies/addressResolution},
 *  [timestamp generation]{@link module:policies/timestampGeneration} and
 *  [speculative execution]{@link module:policies/speculativeExecution}.
 * @module policies
 */
import addressResolution from "./address-resolution.js"
import loadBalancing from "./load-balancing.js"
import reconnection from "./reconnection.js"
import retry from "./retry.js"
import speculativeExecution from "./speculative-execution.js"
import timestampGeneration from "./timestamp-generation.js"

export { addressResolution }
export { loadBalancing }
export { reconnection }
export { retry }
export { speculativeExecution }
export { timestampGeneration }

export default {
	addressResolution,
	loadBalancing,
	reconnection,
	retry,
	speculativeExecution,
	timestampGeneration,
	defaultAddressTranslator,
	defaultLoadBalancingPolicy,
	defaultRetryPolicy,
	defaultReconnectionPolicy,
	defaultSpeculativeExecutionPolicy,
	defaultTimestampGenerator,
}

/**
 * Returns a new instance of the default address translator policy used by the driver.
 * @returns {AddressTranslator}
 */
export function defaultAddressTranslator() {
	return new addressResolution.AddressTranslator()
}

/**
 * Returns a new instance of the default load-balancing policy used by the driver.
 * @param {string} [localDc] When provided, it sets the data center that is going to be used as local for the
 * load-balancing policy instance.
 * <p>When localDc is undefined, the load-balancing policy instance will use the <code>localDataCenter</code>
 * provided in the {@link ClientOptions}.</p>
 * @returns {LoadBalancingPolicy}
 */
export function defaultLoadBalancingPolicy(localDc) {
	return new loadBalancing.DefaultLoadBalancingPolicy(localDc)
}

/**
 * Returns a new instance of the default retry policy used by the driver.
 * @returns {RetryPolicy}
 */
export function defaultRetryPolicy() {
	return new retry.RetryPolicy()
}

/**
 * Returns a new instance of the default reconnection policy used by the driver.
 * @returns {ReconnectionPolicy}
 */
export function defaultReconnectionPolicy() {
	return new reconnection.ExponentialReconnectionPolicy(
		1000,
		10 * 60 * 1000,
		false,
	)
}

/**
 * Returns a new instance of the default speculative execution policy used by the driver.
 * @returns {SpeculativeExecutionPolicy}
 */
export function defaultSpeculativeExecutionPolicy() {
	return new speculativeExecution.NoSpeculativeExecutionPolicy()
}

/**
 * Returns a new instance of the default timestamp generator used by the driver.
 * @returns {TimestampGenerator}
 */
export function defaultTimestampGenerator() {
	return new timestampGeneration.MonotonicTimestampGenerator()
}
