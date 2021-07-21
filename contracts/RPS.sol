//todo add events for all the important ones.... commited, revealed, game over etc etc.
//todo fix withdraw function
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract RPS {
    struct Player {
        address addr;
        bytes32 commit;
        string revealed;
        uint256 staked;
        uint256 winnings;
    }
    struct Move {
        uint256 value;
        bool valid;
    }

    Player[2] public players;
    mapping(address => uint256) addressToID;

    IERC20 public SlingBux;

    mapping(string => Move) moves;

    uint256 public buyIn;

    bool public gameIsLive = true;
    address public winner;
    address initiator;

    constructor(
        address _player1Address,
        address _player2Address,
        uint256 _buyIn,
        address _tokenContract
    ) {
        moves["rock"] = Move({value: 0, valid: true});
        moves["paper"] = Move({value: 1, valid: true});
        moves["scissors"] = Move({value: 2, valid: true});
        players[0] = Player({
            addr: _player1Address,
            commit: "",
            revealed: "",
            staked: 0,
            winnings: 0
        });
        players[1] = Player({
            addr: _player2Address,
            commit: "",
            revealed: "",
            staked: 0,
            winnings: 0
        });
        buyIn = _buyIn;
        SlingBux = IERC20(_tokenContract);
        addressToID[_player1Address] = 0;
        addressToID[_player2Address] = 1;
        initiator = _player1Address;
    }

    modifier onlyPlayers() {
        require(msg.sender == players[0].addr || msg.sender == players[1].addr);
        _;
    }
    modifier readyToReveal() {
        require((bothCommited()), "Both players must commit.");
        require(gameIsLive, "Winner already selected.");
        _;
    }

    function bothCommited() internal view returns (bool) {
        return !isEmpty(players[0].commit) && !isEmpty(players[1].commit);
    }

    function isEmpty(bytes32 _bytes) internal pure returns (bool) {
        return (_bytes == "");
    }

    function isEmpty(string memory _string) internal pure returns (bool) {
        return (keccak256(abi.encodePacked(_string)) ==
            keccak256(abi.encodePacked("")));
    }

    function closeGame() internal {
        players[0].staked = 0;
        players[1].staked = 0;
        gameIsLive = false;
    }

    function calculateAllowance(address _sender)
        internal
        view
        returns (uint256)
    {
        return
            SlingBux.allowance(_sender, address(this)) +
            players[addressToID[_sender]].winnings;
    }

    function debitBalances(address _address) internal {
        uint256 playerWinnings = players[addressToID[_address]].winnings;
        if (playerWinnings >= buyIn) {
            players[addressToID[_address]].winnings = playerWinnings - buyIn;
        } else {
            SlingBux.transferFrom(
                _address,
                address(this),
                buyIn - playerWinnings
            );
            players[addressToID[_address]].winnings = 0;
        }
        players[addressToID[msg.sender]].staked = buyIn;
    }

    function commitMove(bytes32 _move)
        external
        onlyPlayers
        returns (bool success)
    {
        require(
            isEmpty(players[addressToID[msg.sender]].commit),
            "Already made a commitment"
        );
        if (players[addressToID[msg.sender]].staked < buyIn) {
            require(
                calculateAllowance(msg.sender) >= buyIn,
                "Allowed balance not sufficient for game deposit"
            );
            debitBalances(msg.sender);
            players[addressToID[msg.sender]].commit = _move;
        } else {
            players[addressToID[msg.sender]].commit = _move;
        }
        return true;
    }

    function revealMove(string memory _move, string memory _seed)
        external
        onlyPlayers
        readyToReveal
        returns (bool success)
    {
        uint256 playerID = addressToID[msg.sender];
        require(
            keccak256(abi.encodePacked(_move, _seed)) ==
                players[playerID].commit,
            "Move doesn't match hash"
        );
        players[playerID].revealed = _move;
        if (!moves[_move].valid) {
            //Code executed when invalid move...
            if (playerID == 0) {
                players[1].winnings += (2 * buyIn);
                winner = players[1].addr;
                closeGame();
            } else if (playerID == 1) {
                players[0].winnings += (2 * buyIn);
                winner = players[0].addr;
                closeGame();
            }
        } else {
            selectWinner();
        }

        return true;
    }

    function selectWinner() internal {
        if (!isEmpty(players[1].revealed) && !isEmpty(players[0].revealed)) {
            uint256 p1_move = moves[players[0].revealed].value;
            uint256 p2_move = moves[players[1].revealed].value;
            if (p1_move != p2_move) {
                winner = (p1_move == (p2_move + 1) % 3)
                    ? players[0].addr
                    : players[1].addr;
                players[addressToID[winner]].winnings += (buyIn * 2);
            } else {
                players[0].winnings += buyIn;
                players[1].winnings += buyIn;
            }
            closeGame();
        }
    }

    function withdrawStake() external onlyPlayers returns (bool success) {
        require(msg.sender == initiator, "Only initiator can withdraw early");
        require(
            !bothCommited(),
            "Both players have commited, no early withdrawals"
        );
        SlingBux.transfer(initiator, players[addressToID[msg.sender]].staked);
        closeGame();
        return true;
    }

    function withdrawWinnings() external onlyPlayers returns (bool success) {
        require(players[addressToID[msg.sender]].winnings > 0, "No winnings");
        uint256 toSend = players[addressToID[msg.sender]].winnings;
        players[addressToID[msg.sender]].winnings = 0;
        SlingBux.transfer(msg.sender, toSend);
        return true;
    }

    function rematch(uint256 _newBuyIn)
        external
        onlyPlayers
        returns (bool success)
    {
        require(!gameIsLive, "Finish existing game before starting a rematch");
        require(calculateAllowance(msg.sender) > _newBuyIn);
        buyIn = _newBuyIn;
        debitBalances(msg.sender);
        winner = address(0);
        initiator = msg.sender;
        gameIsLive = true;
        players[0].commit = "";
        players[0].revealed = "";
        players[1].commit = "";
        players[1].revealed = "";
        return true;
    }
}
