"use strict";

const Api = require('@parity/api');
const BigNumber = require('bignumber.js');
const express = require('express');
const app = express();

const provider = new Api.Provider.Http('http://localhost:8645');
const api = new Api(provider);

const abi = require('./mix_revenue.abi.json');
const address = '0x97c7f4f8f0bbf384578a9f5754ae73f37ff49ec2';
const contract = api.newContract(abi, address);

app.get('/', function (req, res) {

  api.eth.blockNumber().then((blockNumber) => {

    contract.instance.getReleased.call({}, blockNumber).then((released) => {

      api.parity
        .listAccounts(1000000000, null, blockNumber)
        .then((accounts) => {
          var total = new BigNumber(api.util.toWei(-55000000, 'ether').plus(released));
          var promises = [];

          for (var account of accounts) {
            promises.push(api.eth.getBalance(account, blockNumber)
              .then((balance) => {
                total = total.plus(balance);
              }));
          }

          Promise.all(promises).then(() => {
            res.json({blockNumber: blockNumber, circulatingSupply: api.util.fromWei(total, 'ether').toString()});
          });
        });
    });
  });
});

app.listen(4000, function () {
  console.log('MIX Supply listening on port 4000');
});
