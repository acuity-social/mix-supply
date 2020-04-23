let Api = require('@parity/api')
import BigNumber from 'bignumber.js'
import express from 'express'
let app = express()

let provider = new Api.Provider.Http('http://127.0.0.1:8645')
let api = new Api(provider)

let abi = require('./mix_revenue.abi.json')
let address = '0x97c7f4f8f0bbf384578a9f5754ae73f37ff49ec2'
let contract = api.newContract(abi, address)

app.get('/', async function (req: any, res: any) {

  let blockNumber = await api.eth.blockNumber()
  let released = await contract.instance.getReleased.call({}, blockNumber)
  let accounts = await api.parity.listAccounts(1000000000, null, blockNumber)
  let total = new BigNumber(api.util.toWei(-55000000, 'ether').plus(released))
  let promises = []

  for (let account of accounts) {
    promises.push(api.eth.getBalance(account, blockNumber)
      .then((balance: number) => {
        total = total.plus(balance)
      }))
  }

  Promise.all(promises).then(() => {
    res.json({blockNumber: blockNumber, circulatingSupply: api.util.fromWei(total, 'ether').toString()})
  })
})

app.get('/circulatingSupply', async function (req: any, res: any) {

  let blockNumber = await api.eth.blockNumber()
  let released = await contract.instance.getReleased.call({}, blockNumber)
  let accounts = await api.parity.listAccounts(1000000000, null, blockNumber)
  let total = new BigNumber(api.util.toWei(-55000000, 'ether').plus(released))
  let promises = []

  for (let account of accounts) {
    promises.push(api.eth.getBalance(account, blockNumber)
      .then((balance: number) => {
        total = total.plus(balance)
      }))
  }

  Promise.all(promises).then(() => {
    res.send(api.util.fromWei(total, 'ether').toString())
  })
})

app.listen(4000, function () {
  console.log('MIX Supply listening on port 4000')
})
