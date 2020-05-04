# 课前准备
- 课程中用到的数据接口

```
// 用户信息
http://rap2.taobao.org:38080/app/mock/252985/userInfo

// 用户账单
http://rap2.taobao.org:38080/app/mock/252985/bill?userId=1

// 手机
http://rap2.taobao.org:38080/app/mock/252985/mobilephone

// 电脑
http://rap2.taobao.org:38080/app/mock/252985/computer

// 电视机
http://rap2.taobao.org:38080/app/mock/252985/TV

```

- 简单封装一个ajax方法

```
/**
 * ajax方法接受一个obj对象
 * obj = {
 *  url:'', //请求接口地址
 *  success(data){}, //成功回掉
 *  fail(err){} //失败回掉
 * } 
 */
function ajax(obj) {
    let xhr = new XMLHttpRequest();
    xhr.open('get', obj.url, true);
    xhr.send();
    xhr.onreadystatechange = function () {
        if (xhr.readyState === 4 && xhr.status === 200) {
            let data = (JSON.parse(xhr.responseText));
            if(data.isOk === false){
                obj.fail ? obj.fail(data): null;
            }else{
                obj.success(data);
            }
        }
    }
}
```

# Promise基础
Promise 是异步编程的一种解决方案，比传统的解决方案（回调函数和事件）更合理和更强大。它由社区最早提出和实现，ES6将其写进了语言标准，统一了用法，并提供了原生的Promise。

在Promise之前，在js中的异步编程都是采用回调函数和事件的方式，但是这种编程方式在处理复杂业务的情况下，很容易出现callback hell（回调地狱），使得代码很难被理解和维护。

例如Ajax的回调问题，如果下一个ajax请求要用到上一个Ajax请求中的结果，那么就会导致多个回调嵌套的问题。

代码示例`ajax.html`：[点击查看源码](./demo/ajax.html)

## 1. 理解Promise

- Promise对象相当于一个容器，里面用于存储一个异步操作的结果，我们可以是从中获取异步操作结果的相关信息。
- Promise对象拥有一个未完成、但预计将来会完成的操作。该操作有以下三种状态：

```
pending：初始值，不是fulfilled，也不是rejected

fulfilled：代表操作成功

rejected：代表操作失败
```

- Promise有两种状态改变的方式，既可以从pending转变为fulfilled，也可以从pending转变为rejected。

![状态转化关系](./status.png)

当状态发生变化，通过then函数绑定的相关状态的函数就会被调用。

一旦状态改变，就「凝固」了，会一直保持这个状态，不会再发生变化。

Promise的使用语法：

```
// 以下是伪代码
var p = new Promise(function (resolve, reject) {
    // ...
    if(/* 异步操作成功 */){
        resolve(result);
    } else {
        reject(error);
    }
});

p.then(function (value) {
    // 完成态
}, function (error) {
    // 失败态
});
```

我们需要关注的点：

### 1.1 传入构造函数的函数executor
在声明一个Promise对象实例时，需要向**Promise构造函数**中传入一个匿名函数，我们称之为executor，executor接受`resolve函数`和`reject函数`两个参数：

- 其中`resolve函数`用于**触发**完成态之后的操作，`resolve函数`在调用时接受一个`result`入参
- 其中`reject函数`用于**触发**失败态之后的操作，`reject函数`在调用时接受一个`error`入参

### 1.2 Promise实例的then函数

代码示例：`Promise1.html`：[点击查看源码](./demo/Promise1.html)

### 1.3 then函数的链式调用

代码示例：`Promise2.html`：[点击查看源码](./demo/Promise2.html)

## 2. 用Promise包装ajax

用Promise包装一下ajax实现更优雅的异步调用：

```
let p_ajax = function(url){
        let p = new Promise((resolve,reject)=>{
            ajax({
                url: url,
                success(data){
                    resolve(data);
                },
                fail(err){
                    reject(err);
                }
            });
        });

        return p;
    };

p_ajax('http://rap2.taobao.org:38080/app/mock/252985/userInfo').then((val)=>{
        let user = val;
        console.log('用户信息',user);
        let p = p_ajax('http://rap2.taobao.org:38080/app/mock/252985/bill?userId='+user.id);
        return p;
    }).then((val)=>{
        let bill = val;
        console.log('用户账单',bill);
    });

```

代码示例：`Promise3.html`：[点击查看源码](./demo/Promise3.html)

## 3. Promise.race方法和Promise.all方法

```
// 请求3个接口，只要有一个接口返回数据，就进行下一步操作
Promise.race([
    p_ajax('http://rap2.taobao.org:38080/app/mock/252985/mobilephone'),
    p_ajax('http://rap2.taobao.org:38080/app/mock/252985/computer'),
    p_ajax('http://rap2.taobao.org:38080/app/mock/252985/TV')
]).then((data)=>{
    let product = data;
    console.log('Promise.race',data);
});

// 请求3个接口，等3个接口的数据都返回后，再做下一步操作
Promise.all([
    p_ajax('http://rap2.taobao.org:38080/app/mock/252985/mobilephone'),
    p_ajax('http://rap2.taobao.org:38080/app/mock/252985/computer'),
    p_ajax('http://rap2.taobao.org:38080/app/mock/252985/TV')
]).then(data=>{
    let products = data;
    console.log('Promise.all',products);
});

```

代码示例：`Promise4.html`：[点击查看源码](./demo/Promise4.html)

# Promise简单实现

## 1. 不支持链式调用

```
const PENDING = 'PENDING';
const RESOLVED = 'RESOLVED';
const REJECTED = 'REJECTED';

class MyPromise {
    constructor(executor) {
        this.status = PENDING;
        this.value = undefined;
        this.reason = undefined;

        this.onFulfilledCallbacks = [];
        this.onRejectedCallbacks = [];

        const resolve = (value) => {
            // 当异步操作调用resolve时
            // 如果Promise对象的status属性的值是PENDING
            if (this.status === PENDING) {
                // 把Promise对象的status属性的值改为RESOLVED
                this.status = RESOLVED;

                // 把resolve传入的value值赋给Promise对象的value属性值
                this.value = value;

                // 依次调用onFulfilledCallbacks中存放的onFulfilled函数
                // 依次调用的到底是什么函数？
                this.onFulfilledCallbacks.forEach(fn => fn());
            }
        }
        const reject = (reason) => {
            // 当异步操作调用reject时
            // 如果Promise对象的status属性的值是PENDING
            if (this.status === PENDING) {
                // 把Promise对象的status属性的值改为REJECTED
                this.status = REJECTED;

                // 把reject传入的reason值赋给Promise对象的reason属性值
                this.reason = reason;

                // 依次调用onRejectedCallbacks中存放的onRejected函数
                this.onRejectedCallbacks.forEach(fn => fn());
            }
        }
        executor(resolve, reject);
    }

    then(onFulfilled, onRejected) {
        if (this.status === RESOLVED) {
            onFulfilled(this.value);
        }

        if (this.status === REJECTED) {
            onRejected(this.reason);
        }

        // 当异步操作未返回时（Promise对象状态为PENDING）
        if (this.status === PENDING) {
            // 把每次调用then函数传入的onFulfilled存放到onFulfilledCallbacks中
            // 思考onFulfilledCallbacks中存放的到底是哪个函数？
            this.onFulfilledCallbacks.push(() => {
                onFulfilled(this.value);
            });
            // 把每次调用then函数传入的onRejected存放到onRejectedCallbacks中
            this.onRejectedCallbacks.push(() => {
                onRejected(this.reason);
            });
        }
    }
};
```

## 2. 支持链式调用

```
const PENDING = 'PENDING';
const RESOLVED = 'RESOLVED';
const REJECTED = 'REJECTED';
const resolvePromise = (x, resolve, reject) => {
    if (!x) {
        resolve(x);
    } else {
        // 如果x有then方法
        // 说明x是一个Promise
        // 调用一次x的then函数
        let then = x.then;
        if (typeof then === 'function') {
            then.call(x, y => {
                resolve(y);
            }, r => {
                reject(r);
            })
        } else {
            resolve(x);
        }
    }
}

class MyPromise {
    constructor(executor) {
        this.status = PENDING;
        this.value = undefined;
        this.reason = undefined;

        this.onFulfilledCallbacks = [];
        this.onRejectedCallbacks = [];

        const resolve = (val) => {
            if (this.status === PENDING) {
                this.status = RESOLVED;
                this.value = val;
                this.onFulfilledCallbacks.forEach(fn => fn());
            }
        }
        const reject = (reason) => {
            if (this.status === PENDING) {
                this.status = REJECTED;
                this.reason = reason;
                this.onRejectedCallbacks.forEach(fn => fn());
            }
        }
        executor(resolve, reject);
    }

    then(onFulfilled, onRejected) {

        // 每次调用then函数则新创建一个Promise
        // 并作为返回值返回
        let promise2 = new MyPromise((resolve, reject) => {
            if (this.status === RESOLVED) {
                // 拿到onFulfilled的返回值x
                let x = onFulfilled(this.value);

                // 用promise2的resolve/reject处理x
                resolvePromise(x, resolve, reject);
            }

            if (this.status === REJECTED) {
                // 拿到onRejected的返回值x
                let x = onRejected(this.reason);

                // 用promise2的resolve/reject处理x
                resolvePromise(x, resolve, reject);
            }

            if (this.status === PENDING) {
                this.onFulfilledCallbacks.push(() => {
                    // 拿到onFulfilled的返回值x
                    let x = onFulfilled(this.value);

                    // 用promise2的resolve/reject处理x
                    resolvePromise(x, resolve, reject);
                });
                this.onRejectedCallbacks.push(() => {
                    // 拿到onRejected的返回值x
                    let x = onRejected(this.reason);

                    // 用promise2的resolve/reject处理x
                    resolvePromise(x, resolve, reject);
                });
            }
        });
        return promise2;
    }
};
```

代码示例：`MyPromise.html`：[点击查看源码](./demo/MyPromise.html)