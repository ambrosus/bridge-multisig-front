import {useWeb3React} from '@web3-react/core';
import {useEffect, useRef, useState} from 'react';
import {
  createBridgeContract,
  ConfiguredInjectedConnector,
  defaultContractAddress,
  getAdresses
} from './utils/contracts';
import Multisig from "./multisig";

function App() {
  const {activate, account, library, chainId} = useWeb3React();

  const [addresses, setAddresses] = useState([]);
  const [address, setAddress] = useState(defaultContractAddress);


  const contract = useRef(null);

  useEffect(() => {
    activate(ConfiguredInjectedConnector);
  }, [chainId]);

  useEffect(() => {
    if (!account) return;
    (async () => {
      setAddresses(Object.entries(await getAdresses()))
      contract.current = createBridgeContract(address, library.getSigner());
    })()
  }, [account, chainId, address]);

  return (<div>
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
    {contract.current && <Multisig contract={contract.current}/>}
  </div>);

}

export default App;
