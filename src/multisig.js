import {useEffect, useState} from "react";
import {getTxs} from "./utils/contracts";
import {ethers} from 'ethers';
import addrNames from "./utils/addressesNames.json";

export default function Multisig({contract}) {
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
  const handleFormData = ({target}) => {
    setFormData((state) => ({...state, [target.name]: target.value}))
  };

  const [data, setData] = useState(null);
  const [txs, setTxs] = useState([]);

  const fetchContractData = async () => {
    setData(null); // loading
    if (!contract) return;

    const implementationAddress = await contract.implementation();

    const multisignersAddresses = await contract.getOwners();
    const multisigners = await Promise.all(multisignersAddresses.map(async (address) => {
      const balance = await contract.provider.getBalance(address);
      return {address, balance};
    }));
    const required = +await contract.required();

    setData({implementationAddress, multisigners, required});
  }

  const updateTxs = async () => {
    setTxs([]); // loading
    if (!contract) return;
    setTxs(await getTxs(contract));
  }


  useEffect(() => {
    fetchContractData().catch((e) => setData({error: e}))
  }, [contract]);
  useEffect(() => {
    updateTxs()
  }, [contract])


  if (!data) {
    return <div>Loading...</div>;
  } else if (data.error) {
    return <div>
      <h4>Can't load data from this contract. <br/>
        Make sure you are connected to the right network and choose a right contract.</h4>
      Error: {data.error.message}
    </div>;
  }


  const handleTx = async (txPromise) => {
    try {
      const tx = await txPromise
      await (tx).wait();

      await updateTxs()
    } catch (e) {
      alert("Error: " + e.message);
      console.error(e);
    }
  }
  const __submitTransaction = async (populatedTx) => _submitTransaction((await populatedTx).data);
  const _submitTransaction = (calldata) => handleTx(contract.submitTransaction(contract.address, 0, calldata, {gasLimit: 10000000}));

  const addOwner = () => __submitTransaction(contract.populateTransaction.addOwner(formData.ownersAdd));
  const removeOwner = () => __submitTransaction(contract.populateTransaction.addOwner(formData.ownersRemove));
  const replaceOwner = () => __submitTransaction(contract.populateTransaction.replaceOwner(formData.ownersReplaceFrom, formData.ownersReplaceTo));
  const changeRequirement = () => __submitTransaction(contract.populateTransaction.changeRequirement(+formData.changeRequirement));

  const upgradeToAndCall = () => {
    if (formData.andCall)
      return handleTx(contract.upgradeToAndCall(formData.upgradeTo, formData.andCall))
    return handleTx(contract.upgradeTo(formData.upgradeTo))
  };
  const submitTransaction = () => _submitTransaction(formData.submitTransaction);
  const confirmTransaction = (id) => handleTx(contract.confirmTransaction(id));
  const revokeConfirmation = (id) => handleTx(contract.revokeConfirmation(id));


  function MyInput({name, placeholder}) {
    return <input name={name} type="text" onChange={handleFormData} value={formData[name]} placeholder={placeholder}/>
  }

  function Transaction({el}) {
    return (
      <div>
        <strong>ID:</strong> <span>{+el.id} </span>
        <br/>

        <strong>Executed:</strong> <span>{el.status} </span>
        {el.executeTx !== undefined &&
          <i>(Tx:: {el.executeTx.transactionHash} )</i>
        }
        <br/>

        <strong>Confirmed by: </strong> <span>{el.confirmed.map(addr => <span
        title={addr}>{addrNames[addr] || addr}  &nbsp;</span>)} </span>
        <br/>

        <strong>Calldata: </strong> <span title={el.data}>{el.parsedData} </span>
        <br/>
        <br/>

        {el.executeTx === undefined && /* show buttons only if not executed yet*/
          (el.confirmed.includes(contract.signer.address) ?
            <button onClick={() => revokeConfirmation(el.id)}>Revoke</button> :
            <button onClick={() => confirmTransaction(el.id)}>Confirm</button>
          )
        }

      </div>
    )
  }


  return (
    <div>
      <span>Implementation address: {data.implementationAddress}</span>


      <hr/>

      <h3>Owners:</h3>
      <ul>
        {data.multisigners.map((el) => (
          <li key={el.address}>
            <code style={{whiteSpace: "pre"}}>{(addrNames[el.address] || "¯\_(ツ)_/¯").padEnd(8)}</code> |&nbsp;
            <code>{el.address}</code> |&nbsp;
            Balance: {ethers.utils.formatEther(el.balance)}
          </li>
        ))}
      </ul>

      <strong>Required:</strong> {data.required}

      {!data.multisigners.includes(contract.signer.address) &&
        <h3>Your address `{contract.signer.address}` not in multisig owners list!</h3>
      }

      <br/>
      <hr/>


      <MyInput name="ownersAdd" placeholder="Add address"/>
      <button onClick={addOwner}>Add</button>
      <br/>

      <MyInput name="ownersRemove" placeholder="Remove address"/>
      <button onClick={removeOwner}>Remove</button>
      <br/>


      <MyInput name="ownersReplaceFrom" placeholder="Replace from"/>
      <MyInput name="ownersReplaceTo" placeholder="Replace to"/>
      <button onClick={replaceOwner}>Replace</button>

      <br/>
      <MyInput name="changeRequirement" placeholder="Change requirement"/>
      <button onClick={changeRequirement}>Change</button>
      <br/>

      <br/>
      <MyInput name="submitTransaction" placeholder="Transaction calldata"/>
      <button onClick={submitTransaction}>Submit</button>
      <br/>
      <MyInput name="upgradeTo" placeholder="upgradeTo"/>
      <MyInput name="andCall" placeholder="andCall"/>
      <button onClick={upgradeToAndCall}>upgradeToAndCall</button>
      <hr/>


      <h3>Transactions <button onClick={updateTxs}>↻</button></h3>
      {txs.map((el) => <Transaction key={+el.id} el={el}/>)}
    </div>
  );
}

