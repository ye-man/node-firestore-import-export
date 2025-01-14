"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
Object.defineProperty(exports, "__esModule", { value: true });
var firestore_helpers_1 = require("./firestore-helpers");
var helpers_1 = require("./helpers");
var importData = function (data, startingRef, mergeWithExisting) {
    if (mergeWithExisting === void 0) { mergeWithExisting = true; }
    var dataToImport = __assign({}, data);
    if (firestore_helpers_1.isLikeDocument(startingRef)) {
        if (!dataToImport.hasOwnProperty('__collections__')) {
            throw new Error('Root or document reference doesn\'t contain a __collections__ property.');
        }
        var collections = dataToImport['__collections__'];
        delete (dataToImport['__collections__']);
        var collectionPromises_1 = [];
        for (var collection in collections) {
            if (collections.hasOwnProperty(collection)) {
                collectionPromises_1.push(setDocuments(collections[collection], startingRef.collection(collection), mergeWithExisting));
            }
        }
        if (firestore_helpers_1.isRootOfDatabase(startingRef)) {
            return firestore_helpers_1.batchExecutor(collectionPromises_1);
        }
        else {
            var documentID = startingRef.id;
            var documentData = {};
            documentData[documentID] = dataToImport;
            var documentPromise = setDocuments(documentData, startingRef.parent, mergeWithExisting);
            return documentPromise.then(function () { return firestore_helpers_1.batchExecutor(collectionPromises_1); });
        }
    }
    else {
        return setDocuments(dataToImport, startingRef, mergeWithExisting);
    }
};
var setDocuments = function (data, startingRef, mergeWithExisting) {
    if (mergeWithExisting === void 0) { mergeWithExisting = true; }
    console.log("Writing documents for " + startingRef.path);
    if ('__collections__' in data) {
        throw new Error('Found unexpected "__collection__" in collection data. Does the starting node match' +
            ' the root of the incoming data?');
    }
    var collections = [];
    var chunks = helpers_1.array_chunks(Object.keys(data), 500);
    var chunkPromises = chunks.map(function (documentKeys) {
        var batch = startingRef.firestore.batch();
        documentKeys.map(function (documentKey) {
            if (data[documentKey]['__collections__']) {
                Object.keys(data[documentKey]['__collections__']).map(function (collection) {
                    collections.push({
                        path: startingRef.doc(documentKey).collection(collection),
                        collection: data[documentKey]['__collections__'][collection],
                    });
                });
                delete (data[documentKey]['__collections__']);
            }
            var documentData = helpers_1.unserializeSpecialTypes(data[documentKey]);
            batch.set(startingRef.doc(documentKey), documentData, { merge: mergeWithExisting });
        });
        return batch.commit();
    });
    return firestore_helpers_1.batchExecutor(chunkPromises)
        .then(function () {
        return collections.map(function (col) {
            return setDocuments(col.collection, col.path, mergeWithExisting);
        });
    })
        .then(function (subCollectionPromises) { return firestore_helpers_1.batchExecutor(subCollectionPromises); })
        .catch(function (err) {
        console.log(err);
    });
};
exports.setDocuments = setDocuments;
exports.default = importData;
