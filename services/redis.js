const Redis = require("ioredis");
const RedisClient = new Redis();
const persistentClient = new Redis({ db: 8 });


const redis = require("redis");
const client = redis.createClient();

client.on("error", function(error) {
	console.error(error);
});


let RedisService = {

	set: async function(key,value){
		let result = await client.set(key.toString(), JSON.stringify(value));
		return result;
	},

	get: async function(key) {
		return new Promise((resolve, reject) => {
			client.get(key, async function(err, value) {
				if(value){
					let res = await JSON.parse(value);
					resolve(res);
				}else{
					resolve(null);
				}
			})
		});
	},

	hset: async function(hash,key,value){
		let result = await client.hset(hash,key.toString(), JSON.stringify(value));
		return result;
	},

	hget: async function(hash,key) {
		return new Promise((resolve, reject) => {
			client.hget(hash,key.toString(), async function(err, value) {
				if(value){
					let res = await JSON.parse(value);
					resolve(res);
				}else{
					resolve(null);
				}
			})
		});
	},

	hdel: async function(hash,key) {
		return new Promise((resolve, reject) => {
			client.hdel(hash,key.toString(), async function(err, value) {
				if(value){
					resolve(value);
				}else{
					resolve(null);
				}
			})
		});
	},

	// hgetall: async function(hash) {
	// 	return new Promise((resolve, reject) => {
	// 		client.hgetall(hash, async function(err, value) {
	// 			if(value){
	// 				resolve(Object.keys(value).map((key) => JSON.parse(value[key])))
	// 			}else{
	// 				resolve(null);
	// 			}

				
	// 		})
	// 	});
	// },

	hgetall: async function(hash) {
		return new Promise((resolve, reject) => {
			client.hgetall(hash, async function(err, value) {
				if(value){
					// console.log(value,'value')
					var newarr = [];
					// objectarr = JSON.parse(value);
					// console.log(objectarr,'objectarrobjectarr')	
					Object.keys(value).map(function(key){
					var keyvalue = JSON.parse(value[key]);
					newarr.push(keyvalue);
					}); 
					// console.log(newarr,'--------------lengt****^^^^&^&^&^&&&&&&^&^&^^^^^^^^^^^^^^^^^^^^^^^****hlength-------------')
					resolve(newarr)
					// resolve(Object.keys(value).map((key) => JSON.parse(value[key])))
				}else{
					resolve(null);
				}

				
			})
		});
	}
}


module.exports = {
  RedisService,
  RedisClient,
  persistentClient,
};
