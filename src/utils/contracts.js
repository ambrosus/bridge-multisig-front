import {ethers} from 'ethers';

import ABI from './abi.json';
import {InjectedConnector} from "@web3-react/injected-connector";

// eth-amb on amb devnet
export const defaultContractAddress = '0xd10398881907BeB5796bf394EE30904Def78e30b';
export const createBridgeContract = (address, provider) => new ethers.Contract(address, ABI, provider);

export const ConfiguredInjectedConnector = new InjectedConnector({
  // supportedChainIds: [ethChainId, ambChainId],
});

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

      resolve({
        ...tx,
        id: txId,
        confirmed,
        status,
        executeTx
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

