/* eslint-env node, es6 */// @ts-check
'use strict';function _asyncToGenerator(fn){return function(){var gen=fn.apply(this,arguments);return new Promise(function(resolve,reject){function step(key,arg){try{var info=gen[key](arg);var value=info.value}catch(error){reject(error);return}if(info.done){resolve(value)}else{return Promise.resolve(value).then(function(value){step('next',value)},function(err){step('throw',err)})}}return step('next')})}}const tasks=require('../tasks');/**
 * @function
 * @param {{[key: string]: any}} object
 * @returns {Object}
 */const create=object=>{const handler={};let revoke=()=>{};/**
   * @function
   * @param {Object} _target
   * @param {string} property
   * @returns
   */handler.deleteObject=(_target,property)=>{if(property==='kill'){throw new Error('Cannot delete reserved keyword/property called [kill]')}delete object[property];return true};/**
   * @function
   * @param {Object} _target
   * @param {string} property
   * @param {any} value
   * @returns
   */handler.set=(_target,property,value)=>{if(property==='kill'){throw new Error('Cannot override reserved keyword/property called [kill]')}object[property]=value;return true};/**
   * @function
   * @param {Object} _target
   * @param {string} property
   * @param {Object} receiver
   * @returns
   */handler.get=(_target,property,receiver)=>{if(property==='kill'){/**
       * @function
       * @param {...any} _values
       * @returns
       */return(..._values)=>{revoke()}}const value=object[property];if(value instanceof Function){/**
       * @function
       * @this {Object}
       * @param {...any} _values
       * @returns
       */return function(..._values){const thisObject=this;return tasks.spawn(_asyncToGenerator(function*(){return value.apply(thisObject===receiver?object:thisObject,_values)}))}}else if(property!=='fallback'&&(value===null||value===undefined)){const fallback=object.fallback;if(fallback instanceof Function){/**
         * @function
         * @this {Object}
         * @param {...any} _values
         * @returns
         */return function(..._values){const thisObject=this;return fallback.apply(thisObject===receiver?object:thisObject,[property,..._values])}}else{return value}}else{return value}};const revocable=Proxy.revocable({},handler);revoke=revocable.revoke;return revocable.proxy};module.exports.create=create;