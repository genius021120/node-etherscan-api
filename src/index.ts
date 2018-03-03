import { NETWORKS }               from './constants/networks'
import { createRequest, TParams } from './utils/createRequest'
import { MODULES }                from './constants/modules'
import { ACTIONS }                from './constants/actions'
import { etherConvert }           from './utils/etherConvert'
// eslint-disable-next-line no-unused-vars
import { UNITS }                  from './constants/units'

/**
 * Etherscan API
 */
export = class EtherscanApi {
  /** Etherscan API token */
  private token: string

  /** Network name */
  private network: keyof typeof NETWORKS

  /** Network API host */
  private host: string

  /**
   * @constructor
   * @param {string} [token="YourApiKeyToken"] Etherscan API token
   * @param {string} [network="main"] Network name. Available: main, ropsten,
   * kovan, rinkeby
   */
  constructor(token = 'YourApiKeyToken', network = 'MAIN') {
    this.token = token

    const netName = network.toUpperCase()
    this.network
      = netName in NETWORKS ? (netName as keyof typeof NETWORKS) : 'MAIN'

    this.host = NETWORKS[this.network]
  }

  /**
   * Returns Ether Balance for a single Address
   * @param address
   * @param {string?} [unit="wei"] Balance unit
   * @return {Promise<string>}
   */
  public async getAccountBalance(
    address: string,
    unit: keyof typeof UNITS = 'wei'
  ): Promise<string> {
    const resp = await this.createRequest({
      module: MODULES.ACCOUNT,
      action: ACTIONS.BALANCE,
      tag:    'latest',
      address
    })

    // Converting balance to another unit
    return unit === 'wei' || !(unit in UNITS)
      ? resp
      : etherConvert(resp, 'wei', unit)
  }

  /**
   * Get Ether Balance for multiple Addresses in a single call
   * @description Up to a maximum of 20 accounts in a single batch
   * @param {Array<string>} addresses
   * @param {string?} [unit="wei"] Balance unit
   *
   */
  public async getAccountBalances(
    addresses: string[],
    unit: keyof typeof UNITS = 'wei'
  ): Promise<{ account: string; balance: string }[]> {
    const resp: {
      account: string
      balance: string
    }[] = await this.createRequest({
      apikey:  this.token,
      module:  MODULES.ACCOUNT,
      action:  ACTIONS.BALANCE_MULTI,
      tag:     'latest',
      address: addresses.join(',')
    })

    // Converting balances to another unit
    return unit === 'wei' || !(unit in UNITS)
      ? resp
      : resp.map(item => {
        return {
          account: item.account,
          balance: etherConvert(item.balance, 'wei', unit)
        }
      })
  }

  /**
   * Get a list of 'Normal' Transactions By Address
   * Returns up to a maximum of the last 10000 transactions only
   * @param address Contract address
   * @param startBlock Starting block number to retrieve results
   * @param endBlock Ending block number to retrieve results
   * @param offset Max records to return
   * @param page Page number
   * @param sort Sort type (asc/desc)
   * @return {Promise<TTransaction[]>}
   */
  public async getTransactions(
    address: string,
    startBlock?: number,
    endBlock?: number,
    offset?: number,
    page?: number,
    sort?: 'asc' | 'desc'
  ): Promise<TTransaction[]> {
    return this.createRequest({
      action:     MODULES.ACCOUNT,
      module:     ACTIONS.TRANSACTIONS_LIST,
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
   * @param address Contract address
   * @param startBlock Starting block number to retrieve results
   * @param endBlock Ending block number to retrieve results
   * @param offset Max records to return
   * @param page Page number
   * @param sort Sort type (asc/desc)
   * @return {Promise<TTransaction[]>}
   */
  public async getInternalTransactions(
    address: string,
    startBlock?: number,
    endBlock?: number,
    offset?: number,
    page?: number,
    sort?: 'asc' | 'desc'
  ): Promise<TInternalTransaction[]> {
    return this.createRequest({
      action:     MODULES.ACCOUNT,
      module:     ACTIONS.TRANSACTIONS_LIST_INTERNAL,
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
   * @param transactionHash Contract address
   * @return {Promise<TInternalTransaction[]>}
   */
  public async getInternalTransactionsByHash(
    transactionHash: string
  ): Promise<TTransaction[]> {
    return this.createRequest({
      action: MODULES.ACCOUNT,
      module: ACTIONS.TRANSACTIONS_LIST_INTERNAL,
      txhash: transactionHash
    })
  }

  /**
   * List of Blocks Mined by Address
   * @param address
   * @param offset Max records to return
   * @param page Page number
   * @return {Promise<TBlockInfo[]>}
   */
  public async getMinedBlock(
    address: string,
    offset?: number,
    page?: number
  ): Promise<TBlockInfo> {
    return this.createRequest({
      action: MODULES.ACCOUNT,
      module: ACTIONS.TRANSACTIONS_LIST_INTERNAL,
      address,
      offset,
      page
    })
  }

  /**
   * Returns Contract ABI
   * @param address
   * @return {Promsie<AbiItemDescription[]>}
   */
  public async getContractAbi(address: string): Promise<AbiItemDescription[]> {
    const resp = await this.createRequest({
      module: MODULES.CONTRACT,
      action: ACTIONS.GET_ABI,
      address
    })

    return JSON.parse(resp)
  }

  /**
   * Checks contract execution status (if there was an error during contract
   * execution).
   * @description "isError": "0" = Pass, "isError": "1" = Error during contract
   * execution
   * @param txhash Contract address
   * @return {Promise<object>}
   */
  public async getContractExecutionStatus(
    txhash: string
  ): Promise<{
    isError: string
    errDescription?: string
  }> {
    const resp = await this.createRequest({
      module: MODULES.TRANSACTION,
      action: ACTIONS.GET_CONTRACT_STATUS,
      txhash
    })

    return resp
  }

  /**
   * Checks transaction receipt status (only applicable for post byzantium fork
   * transactions).
   * @description Status: 0 = Fail, 1 = Pass. Will return null/empty value
   * for pre-byzantium fork
   * @param txhash Transaction address
   * @return {Promise<object>}
   */
  public async getTransactionStatus(
    txhash: string
  ): Promise<{ status: string }> {
    return this.createRequest({
      module: MODULES.TRANSACTION,
      action: ACTIONS.GET_TRANSACTION_STATUS,
      txhash
    })
  }

  /**
   * Creates request
   * @private
   * @param params Query params
   * @return {Promise<any>}
   */
  private createRequest(params: TParams): Promise<any> {
    return createRequest(this.host, {
      ...params,
      apikey: this.token
    })
  }
}
