import {ethers} from 'ethers';

import ABI from './abi.json';
import {InjectedConnector} from "@web3-react/injected-connector";

export const createBridgeContract = (address, provider) => new ethers.Contract(address, ABI, provider);

export const ConfiguredInjectedConnector = new InjectedConnector({
  // supportedChainIds: [ethChainId, ambChainId],
});

export async function getContractAddresses() {
  const fetchConfig = async (url, stage) => {
    const response = await (await fetch(url)).json()
    return Object.entries(response.bridges).map(([pair, addresses]) => ([
        {stage, pair, network: 'amb', address: addresses.amb},
        {stage, pair, network: pair, address: addresses.side},
      ])
    )
  };

  const results = await Promise.all([
    fetchConfig('https://bridge-config.ambrosus-dev.io/index.html', 'dev'),
    fetchConfig('https://bridge-config.ambrosus-test.io/index.html', 'test'),
    fetchConfig('https://bridge-config.ambrosus.io/index.html', 'main'),
  ])
  return results.flat(3);
}


export async function getTxs(contract) {
  const count = await contract.transactionCount();

  // args: from, to, includePending, includeExecuted
  const txIds = await contract.getTransactionIds(0, count, true, true);

  // get execution results for each tx from events
  const {txExecuteTx, txStatus} = await getTxLogs(contract);

  const txPromises = txIds.map((txId) => (
    new Promise(async (resolve) => {

      const tx = await contract.transactions(txId);
      const confirmed = await contract.getConfirmations(txId);

      const executeTx = txExecuteTx[txId];
      const status = txStatus[+txId] || 'Not yet';  // Success, Failure or Not yet

      let parsedData = 'Unknown method';
      try {
        parsedData = parseCalldata(contract, tx.data)
      } catch (e) {
      }

      resolve({
        ...tx,
        id: txId,
        confirmed,
        status,
        executeTx,
        parsedData,
      });
    })
  ));

  const txes = await Promise.all(txPromises);
  return txes.reverse() // newest first
}


async function getTxLogs(contract) {
  const txExecuteTx = {};
  const txStatus = {};

  const getEvents = async (filter) => (await contract.queryFilter(filter))
    .map(log => ({...log, ...contract.interface.parseLog(log)}));

  const successfullTx = await getEvents(contract.filters.Execution());
  const failedTx = await getEvents(contract.filters.ExecutionFailure());

  successfullTx.forEach(log => txStatus[log.args.transactionId] = 'Success');
  failedTx.forEach(log => txStatus[log.args.transactionId] = 'Failure');

  [...successfullTx, ...failedTx].forEach(log => txExecuteTx[log.args.transactionId] = log);

  return {txExecuteTx, txStatus};
}

function parseCalldata(contract, data) {
  const replacer = (k, v) => {  // replace BigNumber with hex string
    if (v.type === 'BigNumber') return v.hex;
    return v;
  }
  const calledMethod = contract.interface.getFunction(data.substring(0, 10));
  const calledArgs = contract.interface.decodeFunctionData(calledMethod.name, data);

  const jsonCalledArgs = JSON.stringify(calledArgs, replacer, 1);
  const textArgs = jsonCalledArgs.substring(1, jsonCalledArgs.length - 1).trim(); // trim brackets and spaces
  return `${calledMethod.name}(${textArgs})`;
}
