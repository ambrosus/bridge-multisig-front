import {ethers} from "ethers";

function parseCalldata(abi, calldata) {
  const iface = new ethers.utils.Interface(abi)

  function parse(calldata_) {
    try {
      const calledMethod = iface.getFunction(calldata_.substring(0, 10));
      const calledArgs = iface.decodeFunctionData(calledMethod.name, calldata_);
      return {
        calldata: calldata_,
        name: calledMethod.name,
        inputs: calledMethod.inputs.map((input, i) => ({
          name: input.name,
          type: input.type,
          value: calledArgs[i],
          methodCall: parse(calledArgs[i])
        }))
      }
    } catch (e) {
      return undefined;
    }
  }

  return parse(calldata);
}

export function ParsedCalldata({abi, calldata}) {
  const parsed = parseCalldata(abi, calldata);
  if (!parsed) return <span>{calldata}</span>;
  return <MethodCall call={parsed}/>;
}

function MethodCall({call}) {
  const {name, inputs, calldata} = call;
  return (
    <div className={"methodCall"} title={calldata}>
      {name}(
      <div className={"methodCall-inputs"}>
        {inputs.map(input => <Input key={input.name} {...input}/>)}
      </div>
      )
    </div>
  );
}

function Input(props) {
  const {name, type, value, methodCall} = props;
  return (
    <div className={"methodCall-input"}>
      <span className={"methodCall-input-name"}>{name}</span>
      <span className={"methodCall-input-type"}>({type})</span>:
      <div className={"methodCall-input-value"}>
        {methodCall ?
          <span>parsed method call: <MethodCall call={methodCall}/></span> :
          <code>{Array.isArray(value) ?
            JSON.stringify(value, null, 2) :
            value.toString()}</code>
        }
      </div>
    </div>
  );
}
