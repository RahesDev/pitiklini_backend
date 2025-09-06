const { RedisClient, persistentClient } = require("../redis");

(async function () {
  await RedisClient.flushdb();
})();

const addUser = (user, type) => {
  return new Promise((resolve, reject) => {
    RedisClient
      .multi()
      .lrem(user.user_id + "-" + type, 0, user.id)
      .lpush(user.user_id + "-" + type, user.id)
      .expire(user.user_id + "-" + type, 60 * 60 * 24)
      .exec()
      .then(
        (res) => {
          // console.log("addUser", res);
          resolve({ status: true, message: "User added" });
        },
        (err) => {
          reject({ status: false, message: err.message });
        }
      );
  });
};

const updateLastSeen = (user_id, status) => {
  return new Promise((resolve, reject) => {
    persistentClient
      .multi()
      .hset(user_id, "lastseen", new Date().getTime())
      .hset(user_id, "online", status)
      .exec()
      .then(
        (res) => {
          resolve({ status: true, message: "Lastseen updated" });
        },
        (err) => {
          reject({ status: false, message: err.message });
        }
      );
  });
};

const getLastSeen = (user_id) => {
  return new Promise((resolve, reject) => {
    persistentClient.hvals(user_id).then(
      (res) => {
        if (res[1] == "1") {
          resolve({ status: true, data: res });
        }
        resolve({ status: false, data: "" });
      },
      (err) => {
        reject({ status: false, message: err.message });
      }
    );
  });
};

const removeUser = (user, id, type) => {
  return new Promise((resolve, reject) => {
    RedisClient.lrem(user + "-" + type, 1, id).then(
      (res) => {
        // console.log("removeUser", res);
        if (res === 1) {
          resolve({ status: true, message: "User removed" });
        }
        resolve({ status: true, message: "User not in list" });
      },
      (err) => {
        resolve({ status: false, message: err.message });
      }
    );
  });
};

const isUserActive = (user, type) => {
  return new Promise((resolve, reject) => {
    RedisClient
      .multi()
      .llen(user + "-" + type)
      .exec()
      .then(
        (res) => {
          // console.log("isUserActive", res);
          if (res[0] > 0) {
            resolve({ status: true, message: "user online" });
          }
          reject({ status: false, message: "no user" });
        },
        (err) => {
          reject({ status: false, message: err.message });
        }
      );
  });
};

const getSocketId = (user, type) => {
  return new Promise((resolve, reject) => {
    RedisClient.lrange(user + "-" + type, 0, -1).then(
      (res) => {
        console.log("res-----------",res)
        if (res) {
          // console.log("getSocketid", res);
          resolve({ status: true, message: "user online", id: res });
        }
        reject({ status: false, message: "no user" });
      },
      (err) => {
        console.log("err-----------",err)
        reject({ status: false, message: err.message });
      }
    );
  });
};

module.exports = {
  addUser,
  getSocketId,
  removeUser,
  updateLastSeen,
  getLastSeen,
};
