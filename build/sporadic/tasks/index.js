/* eslint-env node, es6 */// @ts-check
'use strict';/**
 * @function
 * @template T
 * @param {() => T | void | Promise<T> | Promise<void>} block
 * @returns {Promise<T | void | null>}
 */function _asyncToGenerator(fn){return function(){var gen=fn.apply(this,arguments);return new Promise(function(resolve,reject){function step(key,arg){try{var info=gen[key](arg);var value=info.value}catch(error){reject(error);return}if(info.done){resolve(value)}else{return Promise.resolve(value).then(function(value){step('next',value)},function(err){step('throw',err)})}}return step('next')})}}const spawn=block=>{return new Promise((resolve,reject)=>{setTimeout(_asyncToGenerator(function*(){try{const blockWrapper=(()=>{var _ref2=_asyncToGenerator(function*(){return block()});return function blockWrapper(){return _ref2.apply(this,arguments)}})();const result=yield blockWrapper();/** @type {any} */const dynamicResult=result;const finalResult=yield dynamicResult;resolve(finalResult)}catch(reason){reject(reason)}}),1)})};/**
 * @function
 * @param {number} seconds
 * @returns {Promise<number>}
 */const delay=seconds=>{if(seconds<0){throw new Error(`Invalid amount of seconds: ${seconds}`)}return new Promise((resolve,reject)=>{const startTime=new Date().getTime()/1000;setTimeout(()=>{const endTime=new Date().getTime()/1000;resolve(endTime-startTime)},seconds*1000)})};/**
 * @function
 * @param {number} seconds
 * @returns {Promise<never>}
 */const timeout=seconds=>{if(seconds<0){throw new Error(`Invalid amount of seconds: ${seconds}`)}return new Promise((resolve,reject)=>{const startTime=new Date().getTime()/1000;setTimeout(()=>{const endTime=new Date().getTime()/1000;reject(Error(`Timed out after ${endTime-startTime} seconds`))},seconds*1000)})};/**
 * @template T
 * @typedef {object} SporadicDeferred<T>
 * @property {(value: T) => void} resolve
 * @property {(reason: any) => void} reject
 * @property {Promise<T>} promise
 *//**
 * @function
 * @template T
 * @returns {SporadicDeferred<T>}
 */const defer=()=>{const internal={};const result={};result.changed=false;result.broken=false;result.promise=new Promise((resolve,reject)=>{internal.resolve=resolve;internal.reject=reject});result.resolve=value=>{if(result.changed){return}result.changed=true;internal.resolve(value)};result.reject=reason=>{if(result.changed){return}result.changed=true;result.broken=true;internal.reject(reason)};return result};/**
 * @function
 * @template T
 * @param {Promise<T>} promise
 * @returns {Promise<boolean>}
 */const ignore=promise=>promise.then(()=>true).catch(()=>true);const already=()=>Promise.resolve();const never=()=>new Promise((resolve,reject)=>{});module.exports.already=already;module.exports.never=never;module.exports.spawn=spawn;module.exports.defer=defer;module.exports.delay=delay;module.exports.timeout=timeout;module.exports.ignore=ignore;