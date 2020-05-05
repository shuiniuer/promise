# 《Promise的原理和实现》

## Promise基础
Promise是js异步编程的一种解决方案，它是由社区最早提出和实现；ES6将其写进了语言标准，并提供了原生的Promise对象。

在Promise之前，在js中的异步编程一般采用【回调函数】的方式来处理，但是这种编程方式在处理复杂业务的情况下，很容易出现callback hell（回调嵌套地狱）问题，使代码变得很难维护。

例如我们常用的Ajax的回调，如果下一个Ajax请求要用到上一个Ajax请求的返回结果，就会出现上述问题。

代码示例：`ajax.html`：[点击查看源码](./demo/ajax.html)

### 1. 理解Promise

Promise使用语法：

```
var p = new Promise(function (resolve, reject) {
	 // ...
    if(/* 异步操作成功 */){
    	// 触发【异步操作成功后】的后续操作
       resolve(result); //result为异步操作成功拿到的结果
    } else {
    	// 触发【异步操作失败后】的后续操作
       reject(reason); //reason为异步操作失败拿到的结果
    }
});

p.then(function (result) {
    // 声明【异步操作成功后】的后续操作
    // ...
}, function (reason) {
    // 声明【异步操作失败后】的后续操作
    // ...
});
```

- Promise对象拥有一个未完成，但预计将来会完成的【异步操作】
- Promise对象用then方法声明【异步操作完成后】的后续操作
- Promise对象相包含一个容器，该容器用于存储【异步操作】的结果

异步操作有以下三种状态：

> - pending：初始值
> - fulfilled：代表操作成功
> - rejected：代表操作失败

- 异步操作状态改变的方式有两种：

> - 从pending转变为fulfilled
> - 从pending转变为rejected

当状态发生变化时，通过then函数声明的【后续操作函数】就会被调用。
状态一旦改变就【凝固】了，会一直保持这个状态，不会再发生变化。

代码示例：`Promise1.html`：[点击查看源码](./demo/Promise1.html)

需要关注的点：

#### 1.1 传入构造函数的executor函数
在声明一个Promise对象实例时，需要向【Promise构造函数】中传入一个匿名函数，我们把该函数叫做executor，executor传入构造函数后会立即执行。

executor接受`resolve函数`和`reject函数`两个参数：

- 调用`resolve函数`用于【触发】完成态之后的操作，`resolve函数`在调用时接受一个`result`入参
- 调用`reject函数`用于【触发】失败态之后的操作，`reject函数`在调用时接受一个`reason`入参

#### 1.2 Promise实例的then函数

- 在实例化一个Promise对象之后，我们调用该对象实例的then函数来【定义Promise异步操作完成后】的后续操作，即：**resolve和reject被调用后的操作**。
then函数接受两个函数作为入参：

> 第一个入参对应着**resolve被调用**后的后续操作（Promise状态由从pending转变为fulfilled），我们把该函数叫做onFulfilled；onFulfilled接受一个入参，入参的值为调用resolve函数时传入的值。
>
> 第二个入参对应着**reject被调用**后的后续操作（Promise状态由从pending转变为rejected），我们把该函数叫做onRejected函数；onRejected接受一个入参，入参的值为调用reject函数时传入的值。

- Promise对象的then函数可以被多次调用，每次调用都使用的是【凝固】后的状态。

#### 1.3 then函数的链式调用

- Promise的then函数支持链式调用：`promise.then(onFulfilled1,onRejected1).then(onFulfilled2,onRejected2)`
- 如果onFulfilled1返回一个普通值x，则onFulfilled2的入参则是这个普通值x
- 如果onFulfilled1返回一个Promise，则onFulfilled2的入参则是这个Promise对应的 resolve 的值

代码示例：`Promise2.html`：[点击查看源码](./demo/Promise2.html)

### 2. 用Promise包装ajax

用Promise包装一下ajax实现更优雅的异步调用：

```
let p_ajax = function(url){
        let p = new Promise((resolve,reject)=>{
            ajax({
                url: url,
                success(data){
                    resolve(data);
                },
                fail(reason){
                    reject(reason);
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

## Promise简单实现

### 1. then不支持链式调用

#### 关键点：
1. Promise构造函数接受一个executor函数，executor函数声明**异步操作**并接受resolve和reject两个参数，用resolve触发**异步操作成功的后续操作**，用reject触发**异步操作失败的后续操作**
2. 异步操作三种状态：

> - pending：初始值
> - fulfilled：代表操作成功
> - rejected：代表操作失败
> - 异步操作状态改变的方式有两种：
> - 从pending转变为fulfilled
> - 从pending转变为rejected

3. Promise实例的then函数用来声明**异步操作完成后**的后续操作，用onFulfilled声明**异步操作成功后的操作**，用onRejected声明**异步操作失败后的操作**，then函数可以被多次调用
4. resolve和onFulfilled对应，二者使用**自己的入参**和**Promise对象的一个属性**共享一个值（result）；reject和onRejected对应，二者使用**自己的入参**和**Promise对象的一个属性**共享一个值（reason）

```
const PENDING = 'PENDING';
const RESOLVED = 'RESOLVED';
const REJECTED = 'REJECTED';

class MyPromise {
    constructor(executor) {
        this.status = PENDING;
        this.result = undefined;
        this.reason = undefined;

        this.onFulfilledCallbacks = [];
        this.onRejectedCallbacks = [];

        const resolve = (result) => {
            // 当异步操作调用resolve时
            // 如果Promise对象的status属性的值是PENDING
            if (this.status === PENDING) {
                // 把Promise对象的status属性的值改为RESOLVED
                this.status = RESOLVED;

                // 把resolve传入的value值赋给Promise对象的result属性值
                this.result = result;

                // 依次调用onFulfilledCallbacks中存放的onFulfilled函数
                // 依次调用的到底是什么函数？
                this.onFulfilledCallbacks.forEach(fn => fn(result));
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
                this.onRejectedCallbacks.forEach(fn => fn(reason));
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
            this.onFulfilledCallbacks.push(onFulfilled);
            
            // 把每次调用then函数传入的onRejected存放到onRejectedCallbacks中
            this.onRejectedCallbacks.push(onRejected);
        }
    }
};
```

### 2. then支持链式调用

#### 关键点：

1. then函数的返回值是**一个新的Promise对象（我们称之为promise2）**，因此then函数支持链式调用
2. **promise2（新的Promise对象）的executor**用来处理**前一个Promise的then**的**onFulfilled和onRejected**的返回值

> - 如果如果onFulfilled和onRejected的返回值是普通值，则用**promise2的resolve**直接返回
> - 如果onFulfilled和onRejected的返回值仍然是一个Promise，则用**promise2的resolve**来返回**当前返回的Promise**的then中的**onFulfilled和onRejected的入参**

```
const PENDING = 'PENDING';
const RESOLVED = 'RESOLVED';
const REJECTED = 'REJECTED';
const resolvePromise = (x, resolve, reject) => {
    if (!x) {
        resolve(x);
    } else {
        // 如果x有then函数
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
        this.result = undefined;
        this.reason = undefined;

        this.onFulfilledCallbacks = [];
        this.onRejectedCallbacks = [];

        const resolve = (result) => {
            if (this.status === PENDING) {
                this.status = RESOLVED;
                this.result = result;
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
            	// 用匿名函数包裹一下onFulfilled
                // 形成了一个闭包 
                // 就可以通过闭包拿到promise2的resolve和reject方法
                this.onFulfilledCallbacks.push(() => {
                    // 拿到onFulfilled的返回值x
                    let x = onFulfilled(this.result);

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


## Promise其他方法：Promise.race、Promise.all等

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

## 辅助资料

- 课程中需要用到的数据接口：

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

- 封装一个简单的ajax方法

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