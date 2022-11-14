import {useWeb3React} from '@web3-react/core';
import {useEffect, useRef, useState} from 'react';
import {
  createBridgeContract,
  ConfiguredInjectedConnector,
  defaultContractAddress,
  getTxs,
  getAdresses
} from './utils/contracts';

function App() {
  const {activate, account, library, chainId} = useWeb3React();

  const [addresses, setAddresses] = useState([]);
  const [address, setAddress] = useState(defaultContractAddress);

  const [implementation, setImplementation] = useState("");
  const [owners, setOwners] = useState([]);
  const [required, setRequired] = useState([]);

  const [formData, setFormData] = useState({
    ownersAdd: '',
    ownersRemove: '',
    ownersReplaceFrom: '',
    ownersReplaceTo: '',
    changeRequirement: '',
    submitTransaction: '',
    upgradeTo: '',
    andCall: '',
  });
  const [txs, setTxs] = useState([]);

  const contract = useRef(null);

  useEffect(() => {
    activate(ConfiguredInjectedConnector);
  }, [chainId]);

  useEffect(() => {
    if (account)
      createContract();

  }, [account, chainId, address]);

  const createContract = async () => {
    setAddresses(Object.entries(await getAdresses()))
    contract.current = createBridgeContract(address, library.getSigner());

    try {
      setImplementation(await contract.current.implementation());
      setOwners(await contract.current.getOwners());
      setRequired(+await contract.current.required());
      setTxs(await getTxs(contract.current));
    } catch (e) {
      setImplementation("Can't fetch info from this contract");
      setOwners([]);
      setRequired("");
      setTxs([]);
    }
  };

  const handleFormData = ({target}) => {
    setFormData((state) => ({
      ...state,
      [target.name]: target.value
    }))
  };

  const handleTx = async (txPromise) => {
    try {
      const tx = await txPromise
      await (tx).wait();
      await createContract()
    } catch (e) {
      alert("Error: " + e.message);
      console.error(e);
    }
  }
  const __submitTransaction = async (populatedTx) => _submitTransaction((await populatedTx).data);
  const _submitTransaction = (calldata) => handleTx(contract.current.submitTransaction(contract.current.address, 0, calldata, {gasLimit: 10000000}));

  const addOwner = () => __submitTransaction(contract.current.populateTransaction.addOwner(formData.ownersAdd));
  const removeOwner = () => __submitTransaction(contract.current.populateTransaction.addOwner(formData.ownersRemove));
  const replaceOwner = () => __submitTransaction(contract.current.populateTransaction.replaceOwner(formData.ownersReplaceFrom, formData.ownersReplaceTo));
  const changeRequirement = () => __submitTransaction(contract.current.populateTransaction.changeRequirement(+formData.changeRequirement));

  const upgradeToAndCall = () => {
    if (formData.andCall)
      return handleTx(contract.current.upgradeToAndCall(formData.upgradeTo, formData.andCall))
    return handleTx(contract.current.upgradeTo(formData.upgradeTo))
  };
  const submitTransaction = () => _submitTransaction(formData.submitTransaction);
  const confirmTransaction = (id) => handleTx(contract.current.confirmTransaction(id));
  const revokeConfirmation = (id) => handleTx(contract.current.revokeConfirmation(id));

  return (
    <div>
      <span>ChainID: {chainId}</span>
      <br/>

      <span>Contract address: </span>
      <input name="address" type="text" onChange={({target}) => setAddress(target.value)} value={address}
             placeholder="Contract address"/>
      <select onChange={(e) => setAddress(e.target.value)}>
        {addresses.map(([k, v]) => (
          <option value={v} key={k}>{k}</option>
        ))}
      </select>
      <br/>
      <span>Implementation address: {implementation}</span>
      <hr/>

      <h3>Owners:</h3>
      <ul>
        {owners.map((el) => (
          <li key={el}>{el}</li>
        ))}
      </ul>

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
      <input name="upgradeTo" type="text" onChange={handleFormData} value={formData.upgradeTo}
             placeholder="upgradeTo"/>
      <input name="andCall" type="text" onChange={handleFormData} value={formData.andCall}
             placeholder="andCall"/>
      <button onClick={upgradeToAndCall}>upgradeToAndCall</button>
      <hr/>


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

          <strong>Calldata: </strong> <span title={el.data}>{el.parsedData} </span>

          {el.executeTx === undefined && /* show buttons only if not executed yet*/
            (el.confirmed.includes(account) &&
              <button onClick={() => revokeConfirmation(el.id)}>Revoke</button> ||
              <button onClick={() => confirmTransaction(el.id)}>Confirm</button>
            )
          }
          <br/>
          <br/>

        </div>
      ))}
    </div>
  );
}

export default App;
