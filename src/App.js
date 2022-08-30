import './App.css';
import {useWeb3React} from '@web3-react/core';
import {useEffect, useRef, useState} from 'react';
import providers, {ambChainId} from './utils/providers';
import createBridgeContract from './utils/contracts';
import {ConfiguredInjectedConnector} from './utils/web3';

function App() {
  const {activate, account, library} = useWeb3React();

  const [chainId, setChainId] = useState(ambChainId);
  const [owners, setOwners] = useState([]);
  const [required, setRequired] = useState([]);

  const [formData, setFormData] = useState({
    ownersAdd: '',
    ownersRemove: '',
    ownersReplaceFrom: '',
    ownersReplaceTo: '',
    changeRequirement: '',
    submitTransaction: '',
  });
  const [txs, setTxs] = useState([]);

  const contract = useRef(null);

  useEffect(() => {
    activate(ConfiguredInjectedConnector);
  }, [chainId]);

  useEffect(() => {
    if (account) {
      createContract();
    }
  }, [account]);

  const createContract = async () => {
    contract.current = createBridgeContract[chainId](library.getSigner());
    handleOwners();
    handleRequired();
    handleTxs();
  };

  const handleOwners = async () => {
    const owners = await contract.current.getOwners();
    setOwners(owners);
  };

  const handleRequired = async () => {
    const required = await contract.current.required();
    setRequired(+required);
  };

  const handleTxs = async () => {
    const {current} = contract;

    const count = await current.transactionCount();
    // args: from, to, includePending, includeExecuted
    const txIds = await current.getTransactionIds(0, count, true, true);

    // get execution results for each tx from events
    const txExecuteTx = {};
    const txStatus = {};
    const getEvents = async (filter) => (await current.queryFilter(filter))
      .map(log => ({...log, ...current.interface.parseLog(log)}));
    const successfullTx = await getEvents(current.filters.Execution());
    const failedTx = await getEvents(current.filters.ExecutionFailure());
    successfullTx.forEach(log => txStatus[log.args.transactionId] = 'Success');
    failedTx.forEach(log => txStatus[log.args.transactionId] = 'Failure');
    [...successfullTx, ...failedTx].forEach(log => txExecuteTx[log.args.transactionId] = log);

    const txPromises = txIds.map((el) => (
      new Promise(async (resolve) => {
        const tx = await current.transactions(el);
        const confirmed = await current.getConfirmations(el);

        const executeTx = txExecuteTx[el];
        const status = txStatus[+el] || 'Not yet';  // Success, Failure or Not yet

        resolve({...tx, id: el, confirmed, status, executeTx});
      })
    ));
    Promise.all(txPromises)
      .then((response) => {
        response.reverse() // newest first
        setTxs(response)
      })
      .catch((e) => {
        console.log(e);
      });
  };

  const handleFormData = ({target}) => {
    setFormData((state) => ({
      ...state,
      [target.name]: target.value
    }))
  };

  const addOwner = () => contract.current.addOwner(formData.ownersAdd);
  const removeOwner = () => contract.current.addOwner(formData.ownersRemove);
  const replaceOwner = () => contract.current.addOwner(formData.ownersReplaceFrom, formData.ownersReplaceTo);
  const changeRequirement = () => contract.current.changeRequirement(+formData.changeRequirement);
  const submitTransaction = () => contract.current.submitTransaction(contract.current.address, 0, formData.submitTransaction);
  // todo revokeConfirmation
  // todo update on transaction confirmed

  const handleConfirm = (id) => {
    contract.current.confirmTransaction(id);
  };

  return (
    <div>
      <h3>Owners:</h3>
      {owners.map((el) => (
        <p key={el}>{el}</p>
      ))}

      <strong>Required:</strong> {required}

      <br/>
      <hr/>


      <input name="ownersAdd" type="text" onChange={handleFormData} value={formData.ownersAdd}
             placeholder="Add address"/>
      <button onClick={addOwner}>Add</button>
      <br/>

      <input name="ownersRemove" type="text" onChange={handleFormData} value={formData.ownersRemove}
             placeholder="Remove address"/>
      <button onClick={removeOwner}>Remove</button>
      <br/>

      <input name="ownersReplaceFrom" type="text" onChange={handleFormData} value={formData.ownersReplaceFrom}
             placeholder="Replace from"/>
      <input name="ownersReplaceTo" type="text" onChange={handleFormData} value={formData.ownersReplaceTo}
             placeholder="Replace to"/>
      <button onClick={replaceOwner}>Replace</button>

      <br/>
      <input name="changeRequirement" type="text" onChange={handleFormData} value={formData.changeRequirement}
             placeholder="Change requirement"/>
      <button onClick={changeRequirement}>Change</button>
      <br/>

      <br/>
      <input name="submitTransaction" type="text" onChange={handleFormData} value={formData.submitTransaction}
             placeholder="Transaction calldata"/>
      <button onClick={submitTransaction}>Submit</button>
      <br/>


      <h3>Transactions:</h3>
      {txs.map((el) => (
        <div key={+el.id}>
          <strong>ID:</strong> <span>{+el.id} </span>
          <br/>

          <strong>Executed:</strong> <span>{el.status} </span>
          {el.executeTx !== undefined &&
            <i>(Tx\: {el.executeTx.transactionHash} )</i>
          }
          <br/>

          <strong>Confirmed by: </strong> <span>{el.confirmed.join(', ')} </span>
          <br/>

          <strong>Calldata: </strong> <span>{el.data} </span>

          {/* show button only if not executed yet */}
          {el.executeTx === undefined &&
            <button onClick={() => handleConfirm(el.id)}>Confirm</button>
          }
          <br/>
          <br/>

        </div>
      ))}
    </div>
  );
}

export default App;
