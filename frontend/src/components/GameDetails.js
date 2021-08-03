import { useMetamask }         from "use-metamask";
import React, {useState, useEffect} from "react";
import { ethers }           from "ethers";
import {abi} from "../ABIs/RPS.json";
import {abi as iERC20} from "../ABIs/SlingBux.json"
import Countdown from 'react-countdown';

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faUser, faAddressCard, faUserSecret, faGamepad} from '@fortawesome/free-solid-svg-icons'

function GameDetails({match}){
    const { connect, getAccounts, getChain, metaState } = useMetamask();
    const [players, setPlayers] = useState([]);
    const [gameInfo, setGameInfo] = useState({})

    const inProgress = {marginLeft:"25vw", width:"50vw", height:"20vh", backgroundColor:"orange", opacity:"20%", marginBottom:"2vh", display:"flex", flexDirection:"column"}
    const finished = {marginLeft:"25vw", width:"50vw", height:"20vh", backgroundColor:"green", opacity:"20%", marginBottom:"2vh", display:"flex", flexDirection:"column"}

    const fetchGameInformation = async() =>{
        try {
        const provider = await metaState.web3;
        const gameInstance = await new ethers.Contract(match.params.address,abi,provider);
        const gameIsLive = await gameInstance.gameIsLive();
        const tokenForGame = await gameInstance.SlingBux();
        const tokenInstance = await new ethers.Contract(tokenForGame,iERC20,provider);
        const tokenSymbol = await tokenInstance.symbol();
        const roundBuyIn = await gameInstance.buyIn();
        const player1 = await gameInstance.players(0);
        const player2 = await gameInstance.players(1);
        const timeLimit = await gameInstance.timeLimit();
        setPlayers([player1, player2]);
        setGameInfo({gameIsLive, tokenForGame, roundBuyIn, timeLimit, tokenSymbol});
        } catch(error){
            console.log(error);
        }
    }

    useEffect(()=>{
        if(metaState.isAvailable && metaState.isConnected){
        fetchGameInformation();
        }
    }, [metaState.isConnected])
    return(<>
    <h2 style = {{color:"white"}}> <u>{match.params.address}</u></h2>
    <div style={gameInfo.gameIsLive ? inProgress : finished}>
        {gameInfo.gameIsLive ? <h2>Waiting for next move</h2> : <h2>Winner Selected</h2>}
        {gameInfo.roundBuyIn &&(
            <p>Buy in for this game was {parseInt(gameInfo.roundBuyIn._hex)} <a href={`https://ropsten.etherscan.io/address/${gameInfo.tokenForGame}`}>{gameInfo.tokenSymbol}</a></p>)}
        {gameInfo.timeLimit && gameInfo.timeLimit._hex !== "0x00" && (
            <p>Countdown for final revelation: <Countdown date={parseInt(gameInfo.timeLimit._hex)} /></p>
        )}
    </div>
        {players.length !==0 &&(
        <div style = {{display:"flex", justifyContent:"space-around", width:"50vw", marginLeft:"25vw"}}>
            {players.map((player, index) =>(
            <div>
                <h3 style={{color:"white"}}> <FontAwesomeIcon icon={faUser}/> Player {index + 1}</h3>
                <ul style = {{color:"white", listStyle: "none", padding:"0"}}>
                    <li className="customIcons">
                        <FontAwesomeIcon className="fixIcons" icon={faAddressCard}/> <b>Address: </b> <a href={`https://ropsten.etherscan.io/address/${player[0]}`}>{player[0]}</a>
                    </li>
                    <li className="customIcons">
                        <FontAwesomeIcon className="fixIcons" icon={faUserSecret}/> <b>Commited?: </b>{player[1] !== "0x0000000000000000000000000000000000000000000000000000000000000000"?"YES":"NO"}
                    </li>
                    <li className="customIcons">
                        <FontAwesomeIcon className="fixIcons" icon={faGamepad}/> <b>Revealed Move:</b>{player[2]!=="" ? player[2] : "N/A"}
                    </li>
                </ul>
            </div>
            ))}


        </div>
        )}
        </>
    )
}

export default GameDetails;