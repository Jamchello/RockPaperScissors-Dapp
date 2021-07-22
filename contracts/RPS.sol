// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/// @title Rock Paper Scissors implemented with a commit-reveal pattern
/// @author Jamie Michel
contract RPS {
    /// @notice Struct for storing all data about a player and their state within the game,
    struct Player {
        address addr;
        bytes32 commit;
        string revealed;
        uint256 staked;
        uint256 winnings;
    }
    /// @notice Data structure for representing all valid "moves"
    struct Move {
        uint256 value;
        bool valid;
    }
    /// @notice an array for holding both players of the game
    Player[2] public players;
    /// @notice a mapping that can be used to assign an address to a player ID - used to locate a player in the array.
    mapping(address => uint256) addressToID;
    /// @notice interface for the ERC-20 token being used for the wagers - contract for token set during deployment.
    IERC20 public SlingBux;
    /// @notice a mapping that can be used to look up the validity of moves during the reveal phase
    mapping(string => Move) moves;
    /// @notice the buyIn value set for the current round of the game
    uint256 public buyIn;
    ///@notice the state of the game
    bool public gameIsLive = true;
    ///@notice winner of this round
    address public winner;
    ///@notice address of the player who started the current round
    address initiator;
    ///@notice time-stamp at which the stake can be claimed by the opponent if a player doesnt reveal their move.
    uint256 public timeLimit = 0;

    constructor(
        address _player1Address,
        address _player2Address,
        uint256 _buyIn,
        address _tokenContract
    ) {
        /// @notice Populating the moves mapping with all the valid moves.
        moves["rock"] = Move({value: 0, valid: true});
        moves["paper"] = Move({value: 1, valid: true});
        moves["scissors"] = Move({value: 2, valid: true});
        /// @notice Populating the array of players with the structured data
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
        /// @notice Creating the mapping for address->ID
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

    ///@notice Checks if both players have comitted their moves
    function bothCommited() internal view returns (bool) {
        return !isEmpty(players[0].commit) && !isEmpty(players[1].commit);
    }

    ///@notice Checks if _bytes is an empty/zero value.
    function isEmpty(bytes32 _bytes) internal pure returns (bool) {
        return (_bytes == "");
    }

    ///@notice Checks if _string is an empty/zero value.
    function isEmpty(string memory _string) internal pure returns (bool) {
        return (keccak256(abi.encodePacked(_string)) ==
            keccak256(abi.encodePacked("")));
    }

    ///@notice Terminates a live game
    function closeGame() internal {
        players[0].staked = 0;
        players[1].staked = 0;
        gameIsLive = false;
    }

    ///@notice Function that caclulates the maximum a user can spend on a buyIn based on their winnings and their ammount of tokens approved to this contract.
    ///@param _sender the address who's spending power will be checked.
    ///@return the spending power of _sender
    function calculateAllowance(address _sender)
        internal
        view
        returns (uint256)
    {
        return
            SlingBux.allowance(_sender, address(this)) +
            players[addressToID[_sender]].winnings;
    }

    ///@notice Internal function which spends a users winnings or ERC-20 tokens (if they exist) on creating the buyIn stake
    ///@param _address the address to debit winnings / SlingBux (ERC-20) tokens from.
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

    ///@notice Function that allows a user to commit their hashed moves
    ///@return success Whether function execution was successful or not.
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

    ///@notice Function that allows a user to "reveal" their move along with seed-phrase
    ///@return success Whether function execution was successful or not.
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
        timeLimit = block.timestamp + 24 hours;
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

    ///@notice Calculates the winner according to traditional Rock, Paper, Scissor logic
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

    //Todo Fix tomorrow
    ///@notice Function that allows a user to withdraw their stake if their opponent hasn't commited anything yet
    ///@return success Whether function execution was successful or not.
    function withdrawStake() external onlyPlayers returns (bool success) {
        require(gameIsLive, "Can only withdraw stake during a live game");
        require(
            (!bothCommited() &&
                msg.sender == initiator &&
                players[addressToID[initiator]].staked != 0) ||
                (bothCommited() &&
                    !isEmpty(players[addressToID[msg.sender]].revealed) &&
                    timeLimit < block.timestamp),
            "Withdrawal Conditions not met."
        );

        SlingBux.transfer(msg.sender, players[addressToID[msg.sender]].staked);
        closeGame();
        return true;
    }

    ///@notice Function that allows a user to withdraw the entirety of their winnings
    ///@return success Whether function execution was successful or not.
    function withdrawWinnings() external onlyPlayers returns (bool success) {
        require(players[addressToID[msg.sender]].winnings > 0, "No winnings");
        uint256 toSend = players[addressToID[msg.sender]].winnings;
        players[addressToID[msg.sender]].winnings = 0;
        SlingBux.transfer(msg.sender, toSend);
        return true;
    }

    ///@notice Function that can be called by users to initiate a rematch
    ///@param _newBuyIn The new buyIn for the game
    ///@return success Whether function execution was successful or not.
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
