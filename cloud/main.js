var publisher = require('cloud/rabbit_lib/publisher');
//var express = require("express");
//var middle = require("./middlewares");
//var location = require("cloud/places/init");
//var sound = require("cloud/sounds/init");
//var motion = require("cloud/motions/init");
var logger = require("cloud/utils/logger");
var _ = require("underscore");

//var installation_params = {
//    "androidID":"123",
//    "deviceID":"234",
//    "installation":"14ljalsdjgaouojlajdfl",
//    "macAddress":"d8:e5:6d:a1:de:a2",
//    "simSerialNumber":"12ljljljl"
//
//
//};

//
AV.Cloud.define("initialze", function(request, response) {

    logger.debug(JSON.stringify(request.params));
    var installation_params = request.params;
    var installation_string = request.params.installation;
    var installation = AV.Object.extend("Installation");
    logger.error(installation_string);
    var query = new AV.Query(installation);
    query.equalTo("installation",installation_string);
    var p = new AV.Promise();

    query.find({
        success:function(results){
            logger.error("installed objects is " + JSON.stringify(results));
            if(results.length == 0) {

                var user_params = {};
                user_params["username"] = "anonymous#" + installation_string;
                user_params["password"] = installation_string;
                var p2 = createUser(user_params);

                p2.then(
                    function (user) {
                        installation_params["user"] = user;
                        createInstallation(installation_params).then(
                            function(user){
                                logger.debug("2");

                                logger.error("user is " + JSON.stringify(user));
                                p.resolve(user);
                        });
                    },
                    function (error) {
                        p.reject(error);
                    });

            } else {
                if (results.length > 1) {//clear the residual installations

                    logger.warn("there are more than 2 installation with same string, contact the admin");
                    var rest_installations = _.rest(results);//_can not be userd another time
                    var destroy_promise = AV.Object.destroyAll(rest_installations);//if there are location mic or sensor data related to the deleted installation
                }                                                                   //it doesn't matter

               // logger.error("object user is " + JSON.stringify(Object.keys()) );

                p.resolve(results[0].get("user"));
            }
        },
        error:function(error){
            logger.error("error is " + JSON.stringify(error));
            if(error.code === AV.Error.OBJECT_NOT_FOUND){
                p.reject("error is AV.Error.OBJECT_NOT_FOUND")
            }
            else{
                p.reject(error);
            }
        }
    });

//    var p1 = new AV.Promise();
//    var promise = p.then(
//
//        function(installation_object) {
//        var usr_query = new AV.Query(AV.User);
//
//        logger.error("retrieved user object is "
//                      +
//        JSON.stringify(installation_object));
//
//        usr_query.equalTo("objectId",installation_object.user.id );
//        return usr_query.find({
//            success: function (results) {
//                logger.error("user objects " + JSON.stringify(results) );
//                if(results.length == 0){
//                    var user_params = {};
//                    user_params["installation"] = installation_obj;
//                    user_params["username"] = "anonymous#" + installation_obj;
//                    user_params["password"] = installation_obj.installation;
//                    //user.set("email", "shixiang@petchat.io");
//// other fields can be set just like with AV.Object
//                    user.set("phone", "13311280378");
//                    p1 = createUser(user_params);
//                }
//                else {
//                    p1.resolve(results[0]);
//                }
//            },
//            error: function (error) {
//                if (error.code === AV.Error.OBJECT_NOT_FOUND) {
//                    p.reject("error is AV.Error.OBJECT_NOT_FOUND");
//                }
//                else {
//                    p1.reject(error); // https://leancloud.cn/docs/js_guide.html#错误处理-1
//                }
//            }
//        });
//        },
//        function(error){
//            p1.reject(error);
//        }
//    );

    p.then(
        function(user){
            //logger.debug("3");

            //logger.error("user is " + JSON.stringify(user) );
            response.success({"userId":user.id});

        },
        function(error){

            response.error({"error":error});
        }
    )
});


var createInstallation = function(params){

    var promise = new AV.Promise();
    var installation = new AV.Object.extend("Installation");
    var i = new installation();

    i.save(params,{
        success:function(i){
            logger.debug("1");
            promise.resolve(i.get("user"));
        },
        error:function(i,error){
            promise.reject(error);
        }
    })
    //
    //
    return promise;

};

var createUser = function(params){


    var promise = new AV.Promise();
    //create the user
    var user = new AV.User();
    var keys =  Object.keys(params);
    //var _ = require("underscore");
    //_.each(keys,function(key){
    //    user.set(key, params[key]);
    //});

    //keys.forEach(
    //    function(key) {
    //        logger.error("fuck here");
    //
    //        user.set(key, params[key]);
    //    });

    user.signUp(params, {
        success: function(user) {
            // Hooray! Let them use the app now.
            logger.debug(user.id );
            promise.resolve(user)
        },
        error: function(user, error) {
            // Show the error message somewhere and let the user try again.
            logger.error("Error: " + error.code + " " + error.message);
            promise.reject({"error":error.message});
        }
    });
    return promise;
};


AV.Cloud.afterSave('UserLocation', function(request) {
    logger.info('There is a new location comming.');
    msg = {
        'objectId': request.object.id,
        'timestamp': Date.now()
    };
    logger.info('The new location object id: ' + request.object.id);
    publisher.publishMessage(msg, 'new_location_arrival');
});

AV.Cloud.afterSave('UserMic', function(request) {
    logger.info('There is a new sound comming.');
    msg = {
        'objectId': request.object.id,
        'timestamp': Date.now()
    };
    logger.info('The new sound object id: ' + request.object.id);
    publisher.publishMessage(msg, 'new_sound_arrival');
});

AV.Cloud.afterSave('UserSensor', function(request) {
    logger.info('There is a new motion comming.');
    msg = {
        'objectId': request.object.id,
        'timestamp': Date.now()
    };
    logger.info('The new motion object id: ' + request.object.id);
    publisher.publishMessage(msg, 'new_motion_arrival');
});