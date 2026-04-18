/* eslint-env node, es6 */// @ts-check
'use strict';function _asyncToGenerator(fn){return function(){var gen=fn.apply(this,arguments);return new Promise(function(resolve,reject){function step(key,arg){try{var info=gen[key](arg);var value=info.value}catch(error){reject(error);return}if(info.done){resolve(value)}else{return Promise.resolve(value).then(function(value){step('next',value)},function(err){step('throw',err)})}}return step('next')})}}const tasks=require('../tasks');const error=()=>Error('Stream is closed!');/**
 * @template T
 * @typedef {object} SporadicStream<T>
 * @property {Promise<T>} current
 * @property {Promise<SporadicStream<T>>} next
 * @property {(value: T) => void} resolve
 * @property {(reason: any) => void} reject
 * @property {boolean} produced
 * @property {boolean} broken
 * @property {((value: T) => T) | null} stepper
 * @property {T | null} pastValue
 * @property {(() => void) | null} finalizer
 */// needed to perform asynchronous recursion, see function below
/**
 * @function
 * @template T
 * @param {*} finalizer
 * @param {*} stepper
 * @param {*} pastValue
 * @param {*} isFirstNode
 * @returns {SporadicStream<T>}
 */function createStream(finalizer=null,stepper=null,pastValue=null,isFirstNode=false){var _tasks$defer=tasks.defer();const promise=_tasks$defer.promise,resolve=_tasks$defer.resolve,reject=_tasks$defer.reject;const broken=false;const produced=false;const next=promise.then(pastValue=>createStream(finalizer,stepper,pastValue,false));/** @type {SporadicStream<T>} */const stream={current:promise,next,resolve,reject,produced,broken,stepper,pastValue,finalizer};if(pastValue!==null&&pastValue!==undefined&&isFirstNode){stream.resolve(pastValue);stream.produced=true}return stream}/**
 * @function
 * @template T
 * @returns {Promise<SporadicStream<T>>}
 */const open=()=>Promise.resolve(createStream());/**
 * @function
 * @template T
 * @param {T} initial
 * @param {(value: T) => T} folding
 * @returns {Promise<SporadicStream<T>>}
 * @description Creates an ondemand stream that computes values based on initial value and folding callback
 * @summary Creates an ondemand stream that computes values based on initial value and folding callback
 */const reducer=(()=>{var _ref=_asyncToGenerator(function*(initial,folding){return createStream(null,folding,initial,true)});return function reducer(_x,_x2){return _ref.apply(this,arguments)}})();/**
 * @function
 * @template T
 * @param {SporadicStream<T>} stream
 * @returns {Promise<{ current: T, next: SporadicStream<T> }>}
 */const pull=(()=>{var _ref2=_asyncToGenerator(function*(stream){if(stream.stepper&&!stream.produced&&!stream.broken&&stream.pastValue!==null&&stream.pastValue!==undefined){try{const stepperWrapper=(()=>{var _ref3=_asyncToGenerator(function*(){return stream.stepper&&stream.pastValue!==null&&stream.pastValue!==undefined?stream.stepper(stream.pastValue):null});return function stepperWrapper(){return _ref3.apply(this,arguments)}})();const stepResult=yield stepperWrapper();if(stepResult){stream.resolve(stepResult);stream.produced=true;stream.stepper=null;stream.pastValue=null}}catch(reason){stream.reject(reason);stream.broken=true;stream.stepper=null;stream.pastValue=null}}const current=yield stream.current;const next=yield stream.next;return{current,next}});return function pull(_x3){return _ref2.apply(this,arguments)}})();/**
 * @function
 * @template T
 * @param {SporadicStream<T>} stream
 * @returns {Promise<{ point: SporadicStream<T> }>}
 */const available=(()=>{var _ref4=_asyncToGenerator(function*(stream){let point=stream;while(point.produced&&!point.broken){point=yield point.next}return{point}});return function available(_x4){return _ref4.apply(this,arguments)}})();/**
 * @function
 * @template T
 * @param {SporadicStream<T>} stream
 * @param {T} value
 * @returns {Promise<SporadicStream<T>>}
 */const push=(()=>{var _ref5=_asyncToGenerator(function*(stream,value){var _ref6=yield available(stream);const point=_ref6.point;point.resolve(value);point.produced=true;const result=yield point.next;// creates a new stream point/node
return result});return function push(_x5,_x6){return _ref5.apply(this,arguments)}})();/**
 * @function
 * @template T
 * @param {SporadicStream<T>} stream
 * @returns {Promise<void>}
 * @description Operation to close a given stream, it never returns and always fails with error
 * @summary Operation to close a given stream, it never returns and always fails with error
 */const close=(()=>{var _ref7=_asyncToGenerator(function*(stream){var _ref8=yield available(stream);const point=_ref8.point;if(point.broken){yield point.next;// always fails
}else{point.reject(error());point.produced=true;point.broken=true;point.stepper=null;try{if(point.finalizer){point.finalizer()}}catch(reason){// shallow/ignore error/reason
}yield point.next;// breaks as well
}});return function close(_x7){return _ref7.apply(this,arguments)}})();const protectedClose=stream=>close(stream).catch(()=>{// shallow/ignore error/reason
});/**
 * @function
 * @param {number} interval The interval in milliseconds
 * @returns {Promise<SporadicStream<boolean>>}
 * @description Fires a stream ticking every given milliseconds (interval), publishing just a true value
 * @summary Fires a stream ticking every given milliseconds (interval), publishing just a true value
 */const every=interval=>{let finalizer=()=>{};const stream=createStream(()=>finalizer());let currentStream=stream;const intervalId=setInterval(()=>{push(currentStream,true).then(nextStream=>{currentStream=nextStream});// .catch() here is never reached :)
},interval);finalizer=()=>{clearInterval(intervalId)};return Promise.resolve(stream)};// stream * closure -> boolean promise
/**
 * @function
 * @template T
 * @param {SporadicStream<T>} stream The source stream to react upon
 * @param {(value: T) => void} procedure A callback to react on stream values
 * @returns {Promise<boolean>} The promise resolved as true if the source stream is closed
 * @summary Reacts to every value published to stream, resolving a boolean promise whenever the source stream is closed
 * @description Reacts to every value published to stream, resolving a boolean promise whenever the source stream is closed
 */const react=(()=>{var _ref9=_asyncToGenerator(function*(stream,procedure){const deferred=tasks.defer();let currentStream=stream;try{while(true){const result=yield pull(currentStream);currentStream=result.next;try{// forces promise resolution if procedure is async
const procedureWrapper=(()=>{var _ref10=_asyncToGenerator(function*(){return procedure(result.current)});return function procedureWrapper(){return _ref10.apply(this,arguments)}})();yield procedureWrapper()}catch(reason){deferred.reject(reason);throw reason;// next catch won't resolve deferred, resolve is ignored
}}}catch(reason){deferred.resolve(true)}const isClosed=yield deferred.promise;return isClosed});return function react(_x8,_x9){return _ref9.apply(this,arguments)}})();// stream * closure -> stream promise
/**
 * @function
 * @template T
 * @param {SporadicStream<T>} stream
 * @param {(value: T) => boolean} predicate
 * @returns {Promise<SporadicStream<T>>}
 */const filter=(()=>{var _ref11=_asyncToGenerator(function*(stream,predicate){const filtered=createStream();let newStream=filtered;// alias to allow garbage collection here
react(stream,function(value){// the call predicate(value) may fail
try{if(predicate(value)){push(newStream,value).then(function(nextStream){newStream=nextStream}).catch(function(reason){protectedClose(newStream)})}}catch(reason){protectedClose(newStream)}}).then(function(){protectedClose(newStream)});// .catch() is never reached here :p
return filtered;// we still return the original / first stream point
});return function filter(_x10,_x11){return _ref11.apply(this,arguments)}})();/**
 * @function
 * @template T
 * @template U
 * @param {SporadicStream<T>} stream
 * @param {(value: T) => U} closure
 * @returns {Promise<SporadicStream<U>>}
 */const map=(()=>{var _ref12=_asyncToGenerator(function*(stream,closure){const transformed=createStream();let newStream=transformed;// alias to allow garbage collection here
react(stream,function(value){try{push(newStream,closure(value)).then(function(nextStream){newStream=nextStream}).catch(function(reason){protectedClose(newStream)})}catch(reason){protectedClose(newStream)}}).then(function(){protectedClose(newStream);// closes result stream if origin is closed too
});// .catch() here is never reached :)
return transformed;// we still return the original / first stream point
});return function map(_x12,_x13){return _ref12.apply(this,arguments)}})();/**
 * @function
 * @template T
 * @param {SporadicStream<T>} leftStream
 * @param {SporadicStream<T>} rightStream
 * @returns {Promise<SporadicStream<T[]>>}
 */const paired=(()=>{var _ref13=_asyncToGenerator(function*(leftStream,rightStream){const outputStream=yield open();let pairedStream=outputStream;let leftStreamPoint=leftStream;let rightStreamPoint=rightStream;react(leftStreamPoint,(()=>{var _ref14=_asyncToGenerator(function*(leftValue){try{const rightStreamNode=yield pull(rightStreamPoint);rightStreamPoint=rightStreamNode.next;pairedStream=yield push(pairedStream,[leftValue,rightStreamNode.current])}catch(reason){yield Promise.all([protectedClose(leftStreamPoint),protectedClose(pairedStream)])}});return function(_x16){return _ref14.apply(this,arguments)}})()).catch(function(){}).then(function(){protectedClose(pairedStream)});react(rightStreamPoint,_asyncToGenerator(function*(){})).catch(function(){}).then(function(){return protectedClose(pairedStream)});return outputStream});return function paired(_x14,_x15){return _ref13.apply(this,arguments)}})();/**
 * @function
 * @template T
 * @template U
 * @param {SporadicStream<T>} leftStream
 * @param {SporadicStream<U>} rightStream
 * @returns {Promise<SporadicStream<T | U>>}
 */const merge=(()=>{var _ref16=_asyncToGenerator(function*(leftStream,rightStream){const mergedStream=yield open();let stepStream=mergedStream;const redirect=(()=>{var _ref17=_asyncToGenerator(function*(signal){stepStream=yield push(stepStream,signal)});return function redirect(_x19){return _ref17.apply(this,arguments)}})();const closedLeft=react(leftStream,redirect);const closedRight=react(rightStream,redirect);Promise.all([closedLeft,closedRight]).then(function(){return protectedClose(stepStream)});return mergedStream});return function merge(_x17,_x18){return _ref16.apply(this,arguments)}})();module.exports.open=open;module.exports.push=push;module.exports.pull=pull;module.exports.close=close;module.exports.react=react;module.exports.filter=filter;module.exports.map=map;module.exports.every=every;module.exports.merge=merge;module.exports.paired=paired;module.exports.reducer=reducer;module.exports.protectedClose=protectedClose;