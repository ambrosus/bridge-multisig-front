import {useWeb3React} from '@web3-react/core';
import {useEffect, useState} from 'react';
import {ConfiguredInjectedConnector, createBridgeContract, getContractAddresses} from './utils/contracts';
import Multisig from "./multisig";

function App() {
  const queryParams = new URLSearchParams(window.location.search);

  const {activate, account, library, chainId} = useWeb3React();
  const [contractsList, setContractsList] = useState([]);
  const [contractAddress, setContractAddress] = useState(queryParams.get('contract'));
  const [contract, setContract] = useState(null);

  useEffect(() => {
    getContractAddresses().then((addresses) => {
      setContractsList(addresses)
      if (!contractAddress) setContractAddress(addresses[0].address);
    });
  }, []);

  useEffect(() => {
    activate(ConfiguredInjectedConnector);
  }, [chainId]);

  useEffect(() => {
    if (!account || !contractAddress) return;
    setContract(createBridgeContract(contractAddress, library.getSigner()));
  }, [account, chainId, contractAddress]);

  const selectContract = ({target}) => {
    setContractAddress(target.value);
    queryParams.set('contract', target.value);
    window.history.replaceState(undefined, undefined, '?' + queryParams.toString());
  }

  return (<div>
    <span>Metamask ChainID: {chainId}</span>
    <br/>

    <span>Contract address: </span>
    <input name="address" type="text" onChange={selectContract} value={contractAddress} placeholder="Contract address"/>
    <select onChange={selectContract} defaultValue={contractAddress}>
      {contractsList.map(({stage, pair, network, address}) => (
        <option key={address} value={address}>
          {`amb-${pair} in ${network.toUpperCase()} ${stage.toUpperCase()}net`}
        </option>
      ))}
    </select>

    <br/>
    {contract && <Multisig contract={contract}/>}
  </div>);

}

export default App;
