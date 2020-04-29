import levelup from 'levelup'
import leveldown from 'leveldown'
import Web3 from 'web3'
import net from 'net'
import express from 'express'
let app = express()
let web3: any
let db: any

async function getBlockReward(blockNumber: number): Promise<number> {
  let reward = 5
  let uncleCount = await web3.eth.getBlockUncleCount(blockNumber)
  let uncleOffset = 0

  while (uncleOffset < uncleCount) {
    let uncleBlock = await web3.eth.getUncle(blockNumber, uncleOffset)
    reward += (uncleBlock.number + 8 - blockNumber) * 5 / 8
    uncleOffset++
  }
  return reward
}

async function catchUp(latest: number) {
  let blockNumber = 0
  let total = 0

  try {
    let state: any = JSON.parse(await db.get('state'))
    blockNumber = state.blockNumber
    total = state.total
  }
  catch {}

  if (blockNumber == latest) {
    return
  }

  while (blockNumber < latest) {
    blockNumber++
    total += await getBlockReward(blockNumber)
    if (blockNumber % 10000 == 0) {
      console.log('Block:', blockNumber.toLocaleString(), 'Mined:', total.toLocaleString())
    }
  }

  await db.put('state', JSON.stringify({
    blockNumber: blockNumber,
    total: total,
  }))
}

async function getReleased(blockNumber: number): Promise<number> {
  let dailyAmount = 50000
  let block: any = await web3.eth.getBlock(blockNumber)
  let released = 0
  let elapsed = Math.floor((block.timestamp - 1493286039) / 86400);

  while ((dailyAmount != 0) && (elapsed > 0)) {
    released += ((elapsed < 200) ? elapsed : 200) * dailyAmount;
    dailyAmount -= 5000
    elapsed -= 200
  }

  return released
}

async function startServer() {
  app.get('/', async function (req: any, res: any) {
    let state: any = JSON.parse(await db.get('state'))
    let released: number = await getReleased(state.blockNumber)
    res.json({
      blockNumber: state.blockNumber,
      circulatingSupply: state.total + released,
    })
  })

  app.get('/circulatingSupply', async function (req: any, res: any) {
    let state: any = JSON.parse(await db.get('state'))
    let released: number = await getReleased(state.blockNumber)
    res.send((state.total + released).toString())
  })

  app.listen(4000, function () {
    console.log('MIX Supply listening on port 4000')
  })
}

async function start() {
  console.log('Waiting for MIX IPC.')
  await new Promise((resolve, reject) => {
    let intervalId = setInterval(async () => {
      try {
        web3 = new Web3(new Web3.providers.IpcProvider(process.env.MIX_IPC_PATH!, net))
        await web3.eth.getProtocolVersion()
        clearInterval(intervalId)
        resolve()
      }
      catch (e) {}
    }, 1000)
  })

  web3.eth.defaultBlock = 'pending'
  web3.eth.transactionConfirmationBlocks = 1

  let blockNumber: number = await web3.eth.getBlockNumber()
  console.log('Block:', blockNumber.toLocaleString())

  db = levelup(leveldown('./db'))

  await catchUp(blockNumber - 240)
  console.log('Caught up.')

  web3.eth.subscribe('newBlockHeaders')
  .on('data', async (blockHeader: any) => {
    await catchUp(blockHeader.number - 240)
  })

  startServer()
}

start()
