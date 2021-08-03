// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;
import "./RPS.sol";

contract Utility {
    address[] public games;

    event gameStarted(
        uint256 timestamp,
        address contractAddress,
        address player1,
        address player2
    );

    function getGameCount() public view returns (uint256) {
        return games.length;
    }

    function getGamesUpTo(uint256 x) external view returns (address[] memory) {
        address[] memory Games = new address[](x);
        // Loop from 1 iteration to 10:
        for (uint256 i = 0; i < x; i++) {
            Games[i] = games[i];
        }
        return Games;
    }

    function startGame(
        address payable _player2Address,
        uint256 _buyIn,
        address _tokenContract
    ) public payable returns (RPS gameContract) {
        RPS newGame = new RPS(
            msg.sender,
            _player2Address,
            _buyIn,
            _tokenContract
        );
        games.push(address(newGame));
        emit gameStarted(
            block.timestamp,
            address(newGame),
            msg.sender,
            _player2Address
        );
        return RPS(newGame);
    }
}
