import { useEffect, useState } from "react";
import { useMetamask }         from "use-metamask";
import { ethers }           from "ethers";
import Button from '@material-ui/core/Button';
import Header from "./components/Header";
import {BrowserRouter as Router, Switch, Route, Link} from 'react-router-dom';
import {abi} from "./ABIs/Utility.json";
import './App.css';
import GameDetails from "./components/GameDetails";
import NewGame from "./components/NewGame";
//Address on Ropsten
const utilityAddress = "0x730Bf24E56d398Cd07d4f018A377C517967B4862";


function App() {
  const { connect, getAccounts, getChain, metaState } = useMetamask();
  const [games, setGames] = useState([]);
  const [chain, setChain] = useState(null);


   const attemptConnection = async () => {
    try {
      await connect(ethers.providers.Web3Provider, "any");
  } catch(error){
    console.log(error);
  }
  }

  useEffect(() => {
    if (metaState.isAvailable) {
      (async () => {
        let chain = await getChain();
        setChain(chain);
      })();
    }
  },[])

  useEffect(() => {
    if (metaState.isAvailable && !metaState.isConnected ) {
      (async () => {
        attemptConnection();
      })();
    }
  }, [metaState.isAvailable]);

  useEffect(()=>{
    if(metaState.isAvailable && metaState.isConnected){
      (async () => {
        // console.log(metaState.web3)
        // let contract = await new ethers.Contract(utilityContract, abi, metaState.web3.provider);
        // let games = await contract.games()
        let chain = await metaState.chain;
        if(chain.id !== "3"){
          return;
        }
        let provider = await metaState.web3;
        let utilityContract = await new ethers.Contract(utilityAddress,abi,provider);
        let gamesCount = await utilityContract.getGameCount();
        let games = await utilityContract.getGamesUpTo(parseInt(gamesCount._hex));
        await setGames(games)
        console.log(games);
      })()

    }
  },[metaState.isAvailable, metaState.isConnected])

  return (
    <Router>
       <div className="App">
      <Header currentUser = {metaState.account}/>
      <Switch>
      <Route path="/" exact><Home metaState chain={chain} callback ={() => attemptConnection()}/> </Route>
      <Route exact path= "/games/" >
        <div>
          <h2 style={{color:"white"}}>Addresses of all current games</h2>
          <p style={{color:"white"}}><i>Click on any address to view more details about the game.</i></p>
          <ul>
            {games.map(game => (
              <li style={{color:"white"}} key={game}><Link to={`/games/${game}`}>{game}</Link></li>
            ))}
          </ul>
        </div>
      </Route>
      <Route exact path="/games/:address" component = {GameDetails}/>
      <Route exact path="/newGame" component = {NewGame}/>
    </Switch>
    </div>
    </Router>
  );
}

const Home = ({chain, callback}) => {
const  { connect, getAccounts, getChain, metaState } = useMetamask();
if(chain !== null && chain.id === "3"){
  return(
    <>
    <img src="https://www.nicepng.com/png/full/111-1113460_rock-paper-scissors-rock-paper-scissors-svg.png" />
<div style={{marginTop:'1vh', marginLeft:"25vw",width:"50vw", display:"flex", justifyContent:"space-around"}}>
      {    metaState.isAvailable && metaState.isConnected ? <LoggedInMenu/> :   <Button variant="contained" color="primary" onClick={async() => {
        callback();
      }}>Connect</Button>}
      </div>
      </>
  )
    }
    else{
      return (
        <div style={{marginTop:'1vh', marginLeft:"25vw",width:"50vw", display:"flex", justifyContent:"space-around"}}>
          <h2>Change MetaMask chain to Ropsten testnet</h2>
        </div>
      )
    }
}
const LoggedInMenu = () => (
  <>
  <Link to="newGame">
  <Button variant="contained" color="primary">
   New game
  </Button>
  </Link>
  <Link to="/myGames">
  <Button variant="contained" color="primary">
    My Games
  </Button>
  </Link>
  <Link to="/games">
  <Button variant="contained" color="primary">
    All games
  </Button>
  </Link>
</>
)

export default App;
