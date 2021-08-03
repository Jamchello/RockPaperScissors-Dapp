import { useMetamask }         from "use-metamask";
import React, {useState, useEffect} from "react";
import { ethers, utils}           from "ethers";
import {abi} from "../ABIs/Utility.json";
import {useForm} from 'react-hook-form';
import { Input, Button } from '@material-ui/core';
const utilityAddress = "0x730Bf24E56d398Cd07d4f018A377C517967B4862";


function NewGame(){
    const inputStyle = {marginInline:"20vw", color:"white", marginTop:"10px", marginBottom:"10px"};
    const [tx, setTx] = useState("");
    const { register, handleSubmit, watch, formState: { errors } } = useForm();
    const [error, setError] = useState(null);
    const [provider, setProvider] = useState(null);
    const [contract, setContract] = useState(null);
    const onSubmit = async (data) => {
        if(! utils.isAddress(data.address)){
            setError('Opponents address not valid');
            return;
        }
        const signer = await provider.getSigner();
        let localContract = await contract.connect(signer);
        let tx = await localContract.startGame(data.address, utils.parseUnits(data.buyIn,18), data.tokenContract);
        setTx(tx);
    }
    const { connect, getAccounts, getChain, metaState } = useMetamask();

    const fetchContract = async() =>{
        try {
        const provider = await metaState.web3;
        const contractInstance = await new ethers.Contract(utilityAddress,abi,provider);
        setProvider(provider);
        setContract(contractInstance);
        } catch(error){
            console.log(error);
        }
    }

    useEffect(()=>{
        if(metaState.isAvailable && metaState.isConnected){
        fetchContract();
        watch("address");
        watch("buyIn");
        watch("tokenContract");
        }
    }, [metaState.isConnected])

    if(tx === ""){
    return(
        <>
        {error&&(
            <div>ERROR: {error}</div>
        )}
        <form onSubmit={handleSubmit(onSubmit)} style={{display:"flex", flexDirection:"column"}}>
            <Input style ={inputStyle} type="text" {...register("address", { required: true, minLength:42, maxLength:42})}placeholder="Opponents address"/>
            {/* todo: fix the data validation */}
            {errors.address && <span>This field is required</span>}
            <Input style ={inputStyle} type="number" {...register("buyIn", { required: true })} placeholder="Buy in value"/>
            {errors.buyIn && <span>This field is required</span>}
            <Input style ={inputStyle} type="text" {...register("tokenContract", { required: true })} placeholder="ERC-20 Contract Address"/>
            {/* errors will return when field validation fails  */}
            {errors.tokenContract && <span>This field is required</span>}
            <Button style={{marginInline:"25vw"}} variant="contained" color="primary" type="submit">Start Game</Button>
        </form>
        </>
    )}
    else {
        return(
            <>

            </>
        )
    }
}

export default NewGame;