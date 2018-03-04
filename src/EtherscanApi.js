const BigNumber = require('bignumber.js')
const MODULES = require('./constants/modules')
const ACTIONS = require('./constants/actions')
const UNITS = require('./constants/units')
const NETWORKS = require('./constants/networks')
const etherConvert = require('./utils/etherConvert')
const getHex = require('./utils/getHex')
const createRequest = require('./utils/createRequest')

class EtherscanApi {
  /**
   * @class EtherscanApi
   * @constructor
   * @param {string} [token] Etherscan API token
   * @param {string} [networkName=MAIN] Network name. Available:
   *  main, ropsten, kovan and rinkeby
   */
  constructor(token = '', networkName = 'MAIN') {
    const netName = networkName.toUpperCase()
    const network = netName in NETWORKS ? netName : 'MAIN'

    this.token = token
    this.network = network
    this.host = NETWORKS[network]
  }

  /**
   * Creates request
   * @private
   * @param {object} params Query params
   * @return {Promise}
   */
  _createRequest(params) {
    return createRequest(this.host, {
      ...params,
      apikey: this.token
    })
  }

  /**
   * Returns Ether balance for a single address
   * @param {string} address Address
   * @param {string} [unit=wei] Balance unit
   * @returns {Promise<string>}
   */
  getAccountBalance(address, unit = 'wei', tag = 'latest') {
    return this._createRequest({
      module: MODULES.ACCOUNT,
      action: ACTIONS.GET_BALANCE,
      tag,
      address
    }).then(resp => {
      // Converting balance to another unit
      return unit === 'wei' || !(unit in UNITS)
        ? resp
        : etherConvert(resp, 'wei', unit)
    })
  }

  /**
   * Returns Ether balance for multiple addresses in a single call.
   * Up to a maximum of 20 accounts in a single batch.
   * @param {Array<string>} addresses List of addresses
   * @param {string} [unit=wei] Balance unit
   * @return {Promise<object>}
   */
  getAccountBalances(addresses, unit = 'wei', tag = 'latest') {
    return this._createRequest({
      apikey:  this.token,
      module:  MODULES.ACCOUNT,
      action:  ACTIONS.GET_BALANCE_MULTI,
      address: addresses.join(','),
      tag
    }).then(resp => {
      // Converting balances to another unit
      return unit === 'wei' || !(unit in UNITS)
        ? resp
        : resp.map(item => {
          return {
            account: item.account,
            balance: etherConvert(item.balance, 'wei', unit)
          }
        })
    })
  }

  /**
   * Get a list of 'Normal' transactions by address
   * Returns up to a maximum of the last 10000 transactions only
   * @param {string} address Contract address
   * @param {string|number} startBlock Starting block number to retrieve results
   * @param {string|number} endBlock Ending block number to retrieve results
   * @param {number} offset Max records to return
   * @param {number} page Page number
   * @param {"asc"|"desc"} sort Sort type
   * @returns {Promise<object[]>}
   */
  getTransactions(address, startBlock, endBlock, offset, page, sort) {
    return this._createRequest({
      module:     MODULES.ACCOUNT,
      action:     ACTIONS.GET_TRANSACTIONS_LIST,
      address,
      endblock:   endBlock,
      startblock: startBlock,
      offset,
      page,
      sort
    })
  }

  /**
   * Returns a list of 'Internal' Transactions by Address
   * Returns up to a maximum of the last 10000 transactions only
   * @param {string} address Contract address
   * @param {string|number} startBlock Starting block number to retrieve results
   * @param {string|number} endBlock Ending block number to retrieve results
   * @param {string|number} offset Max records to return
   * @param {string|number} page Page number
   * @param {"asc"|"desc"} sort Sort type
   * @returns {Promise<object[]>}
   */
  getInternalTransactions(address, startBlock, endBlock, offset, page, sort) {
    return this._createRequest({
      module:     MODULES.ACCOUNT,
      action:     ACTIONS.GET_TRANSACTIONS_LIST_INTERNAL,
      address,
      endblock:   endBlock,
      startblock: startBlock,
      offset,
      page,
      sort
    })
  }

  /**
   * Returns a list of 'Internal' Transactions by Address
   * @param txhash Contract address
   * @returns {Promise<object[]>}
   */
  getInternalTransactionsByHash(txhash) {
    return this._createRequest({
      module: MODULES.ACCOUNT,
      action: ACTIONS.GET_TRANSACTIONS_LIST_INTERNAL,
      txhash
    })
  }

  /**
   * List of blocks mined by address
   * @param {string} address Miner address
   * @param {"blocks"|"uncles"} type Type of block: blocks (full blocks only)
   * or uncles (uncle blocks only)
   * @param {number} offset Max records to return
   * @param {number} page Page number
   * @returns {Promise<object[]>}
   */
  getMinedBlocks(address, type = 'blocks', offset, page) {
    return this._createRequest({
      module:    MODULES.ACCOUNT,
      action:    ACTIONS.GET_MINED_BLOCKS,
      blocktype: type,
      address,
      offset,
      page
    })
  }

  /**
   * Returns Contract ABI
   * @param address
   * @returns {Promsie<object[]>}
   */
  getContractAbi(address) {
    return this._createRequest({
      module: MODULES.CONTRACT,
      action: ACTIONS.GET_ABI,
      address
    }).then(resp => {
      return JSON.parse(resp)
    })
  }

  /**
   * Checks contract execution status (if there was an error during contract
   * execution). "isError": "0" = Pass, "isError": "1" = Error during contract
   * execution
   * @param {string} txhash Contract address
   * @returns {Promise<object>}
   */
  getContractExecutionStatus(txhash) {
    return this._createRequest({
      module: MODULES.TRANSACTION,
      action: ACTIONS.GET_CONTRACT_STATUS,
      txhash
    })
  }

  /**
   * Checks transaction receipt status (only applicable for post byzantium fork
   * transactions). Status: 0 = Fail, 1 = Pass. Will return null/empty value
   * for pre-byzantium fork
   * @param {string} txhash Transaction address
   * @returns {Promise<object>}
   */
  getTransactionStatus(txhash) {
    return this._createRequest({
      module: MODULES.TRANSACTION,
      action: ACTIONS.GET_TRANSACTION_STATUS,
      txhash
    })
  }

  /**
   * Get block and uncle rewards by block number
   * @param {number} blockNumber The number of the block
   */
  getBlockReward(blockNumber) {
    return this._createRequest({
      module:  MODULES.BLOCK,
      action:  ACTIONS.GET_BLOCK_REWARD,
      blockno: blockNumber
    })
  }

  /**
   * Returns events logs.
   * The Event Log API was designed to provide an alternative to the native
   * eth_getLogs. Topic Operator (opr) choices are either 'and' or 'or' and
   * are restricted to the above choices only. For performance and security
   * considerations, only the first 1000 results are return.
   * @param {string} address
   * @param {number} fromBlock Start block number (integer, NOT hex)
   * @param {number|'latest'} toBlock End block number or "latest"
   * (earliest and pending is NOT supported yet)
   * @param {string} topic0 Topic 0
   * @param {"and"|"or"} [topic01operator] Operator between topic0 & topic1
   * @param {string} [topic1] Topic 1
   * @param {"and"|"or"} [topic12operator] Operator between topic1 & topic2
   * @param {string} [topic2] Topic 2
   * @param {"and"|"or"} [topic23operator] Operator between topic2 & topic3
   * @param {string} [topic3] Topic 3
   * @param {"and"|"or"} [topic02operator] Operator between topic0 & topic2
   * @return {Promise<object>}
   */
  getEventsLogs(
    address,
    fromBlock,
    toBlock,
    topic0,
    topic01operator,
    topic1,
    topic12operator,
    topic2,
    topic23operator,
    topic3,
    topic02operator
  ) {
    return this._createRequest({
      module:       MODULES.LOGS,
      action:       ACTIONS.GET_LOGS,
      fromBlock,
      toBlock,
      topic0,
      topic0_1_opr: topic01operator,
      topic1,
      topic1_2_opr: topic12operator,
      topic2,
      topic2_3_opr: topic23operator,
      topic3,
      topic0_2_opr: topic02operator
    })
  }

  /**
   * Returns the number of the most recent block
   * @returns {Promise<number>}
   */
  getRecentBlockNumber() {
    return this._createRequest({
      module: MODULES.PROXY,
      action: ACTIONS.GET_RECENT_BLOCK_NUMBER
    }).then(blockNumberHex => {
      return parseInt(blockNumberHex, 16)
    })
  }

  /**
   * Returns information about a block by block number
   * @param {number} blockNumber Block number
   * @returns {Promise<object>}
   */
  getBlockByNumber(blockNumber) {
    return this._createRequest({
      module:  MODULES.PROXY,
      action:  ACTIONS.GET_BLOCK_BY_NUMBER,
      tag:     '0x' + blockNumber.toString(16),
      boolean: 'true'
    })
  }

  /**
   * Returns information about a uncle by block number and index
   * @param {number} blockNumber
   * @param {number} [index=0]
   * @returns {Promise<object>}
   */
  getUncleByBlockNumberAndIndex(blockNumber, index = 0) {
    return this._createRequest({
      module: MODULES.PROXY,
      action: ACTIONS.GET_UNCLE_BLOCK_NUMBER_AND_INDEX,
      tag:    getHex(blockNumber),
      index:  getHex(index)
    })
  }

  /**
   * Returns the number of transactions in a block from a block matching the
   * given block number
   * @param {number} blockNumber
   * @returns {Promise<number>}
   */
  getBlockTransactionCount(blockNumber) {
    return this._createRequest({
      module: MODULES.PROXY,
      action: ACTIONS.GET_BLOCK_TX_COUNT_BY_NUMBER,
      tag:    getHex(blockNumber)
    }).then(countHex => {
      return parseInt(countHex, 16)
    })
  }

  /**
   * Returns the information about a transaction requested by transaction hash
   * @param {string} txhash Transaction hash
   * @returns {Promise<object>}
   */
  getTransactionByHash(txhash) {
    return this._createRequest({
      module: MODULES.PROXY,
      action: ACTIONS.GET_TRANSACTION_BY_HASH,
      txhash
    })
  }

  /**
   * Returns information about a transaction by block number and transaction
   * index position
   * @param {number} blockNumber
   * @param {number} [index=0]
   * @returns {Promise<object>}
   */
  getTransactionByBlockNumberAndIndex(blockNumber, index = 0) {
    return this._createRequest({
      module: MODULES.PROXY,
      action: ACTIONS.GET_TX_BY_BLOCK_NUMBER_AND_INDEX,
      tag:    getHex(blockNumber),
      index:  getHex(index)
    })
  }

  /**
   * Returns the number of transactions sent from an address
   * @param {string} address Transaction address
   * @returns {Promise<number>}
   */
  getTransactionCount(address, tag = 'latest') {
    return this._createRequest({
      module: MODULES.PROXY,
      action: ACTIONS.GET_TRANSACTION_COUNT,
      tag,
      address
    }).then(countHex => {
      return parseInt(countHex, 16)
    })
  }

  /**
   * Creates new message call transaction or a contract creation for signed
   * transactions
   * @param {string} hex Raw hex encoded transaction that you want to send
   */
  sendRawTransaction(hex) {
    this._createRequest({
      module: MODULES.PROXY,
      action: ACTIONS.SEND_RAW_TRANSACTION,
      hex
    })
  }

  /**
   * Returns the receipt of a transaction by transaction hash
   * @param {string} txhash Transaction hash
   * @returns {Promise<object>}
   */
  getTransactionReceipt(txhash) {
    return this._createRequest({
      module: MODULES.PROXY,
      action: ACTIONS.GET_TRANSACTION_RECEIPT,
      txhash
    })
  }

  /**
   * Executes a new message call immediately without creating a transaction on
   * the block chain
   * @param {string} to Address to execute from
   * @param {string} data Data to transfer
   * @returns {Promise<string>}
   */
  call(to, data, tag = 'latest') {
    return this._createRequest({
      module: MODULES.PROXY,
      action: ACTIONS.CALL,
      tag,
      to,
      data
    })
  }

  /**
   * Returns code at a given address
   * @param {string} address
   * @returns {Promise<string>}
   */
  getCode(address, tag = 'latest') {
    return this._createRequest({
      module: MODULES.PROXY,
      action: ACTIONS.GET_CODE,
      address,
      tag
    })
  }

  /**
   * Returns the value from a storage position at a given address.
   * @param {string} address
   * @param {number} position
   * @returns {Promise<string>}
   */
  getStorageAt(address, position, tag = 'latest') {
    return this._createRequest({
      module:   MODULES.PROXY,
      action:   ACTIONS.GET_STORAGE_AT,
      address,
      position: getHex(position),
      tag
    })
  }

  /**
   * Returns the current price per gas (in wei by default)
   * @param {string} [unit=wei] Unit of gas
   * @returns {string}
   */
  getGasPrice(unit = 'wei') {
    return this._createRequest({
      module: MODULES.PROXY,
      action: ACTIONS.GET_GAS_PRICE
    }).then(priceHex => {
      const priceBN = new BigNumber(priceHex)
      const priceFixed = priceBN.toFixed()

      // If unit is wei, don't convert gas price
      if (unit === 'wei') {
        return priceFixed
      }

      // else covert to specified ether unit
      return etherConvert(priceFixed, 'wei', unit)
    })
  }

  /**
   * Makes a call or transaction, which won't be added to the blockchain and
   * returns the used gas, which can be used for estimating the used gas
   * @param {string} to Address to get code from
   * @param {string} value Storage position
   * @param {string} gasPrice Gas price in wei
   * @param {string} gas
   */
  estimateGas(to, value, gasPrice, gas) {
    this._createRequest({
      module: MODULES.PROXY,
      action: ACTIONS.ESTIMATE_GAS,
      to,
      value,
      gasPrice,
      gas
    })
  }

  /**
   * Returns ERC20-Token total supply by contract address
   * @param {string} contractAddress
   * @returns {Promise<string>}
   */
  getTokenByContractAddress(contractAddress) {
    return this._createRequest({
      module:          MODULES.STATS,
      action:          ACTIONS.GET_TOKEN_BY_CONTRACT,
      contractaddress: contractAddress
    })
  }

  /**
   * Returns ERC20-Token account balance by token's contract address
   * @param {string} contractAddress
   * @returns {Promise<string>}
   */
  getTokenBalanceByContractAddress(contractAddress, address, tag = 'latest') {
    return this._createRequest({
      module:          MODULES.ACCOUNT,
      action:          ACTIONS.GET_TOKEN_BALANCE_BY_CONTRACT,
      contractaddress: contractAddress,
      address,
      tag
    })
  }

  /**
   * Returns total supply of Ether
   * @returns {Promise<string>}
   */
  getTotalEtherSupply() {
    return this._createRequest({
      module: MODULES.STATS,
      action: ACTIONS.GET_TOTAL_ETHER_SUPPLY
    })
  }

  /**
   * Returns Ether last price
   * @returns {Promise<object>}
   */
  getEtherLastPrice() {
    return this._createRequest({
      module: MODULES.STATS,
      action: ACTIONS.GET_LAST_ETHER_PRICE
    })
  }
}

module.exports = EtherscanApi
