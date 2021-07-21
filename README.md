# RockPaperScissors test project: Job application project for Slingshot.

This is my submission to the Slingshot RockPaperScissors job application task.
*Please note that no code was provided by Slingshot, only the brief that can be found at the bottom of this ReadMe.*

Hardhat has been used as the development environment for the task and an extensive set of Waffle tests (using Ether.js) has been created.

My implementation leverages the "commit & reveal" pattern with the keccak256 hashing algorithm; this is essential for turn-based on-chain games to prevent players from peeping eachothers answers.

The front-end (*pending implementation*) will need to encode players inputs with the hashing algorithm using user-defined "seed phrase" before proposing the commit transaction to MetaMask.

## Flow of the game

1.  A user (player 1) calls the startGame() function on the Utility contract, the user will supply the address of player 2, the buy-in for the game, and the contract address of the ERC20 compliant smart contract to be used as the currency.
2.  Players must approve the address of the newly deployed RPS contract to spend a balance at least equal to the buyIn.
3.  Players "commit" their encoded moves - the encoding is the result of a keccak256 hash over a concatenation of the move with a user defined seed phrase.
4.  Once both commitments have been made, both players "reveal" their moves and their seed phrases, the contract will automatically determine the winner.
5.  The winner can either withdraw their winnings, or elect to play another (*if the loser wants to of course!*).
6.  A rematch can be started by calling the rematch function, and supplying a new buyIn value. ***Note:** If a player has an existing balance ("winnings") when starting a rematch, this will always be debited before attempting to transfer the remainder of the owed buyIn balance*

*** The majority of the functionality has been described above / can be found detailed below in the brief! ***

# The original brief provided for the job application by Slingshot:

You will create a smart contract named `RockPaperScissors` whereby:  
Alice and Bob can play the classic game of rock, paper, scissors using ERC20 (of your choosing).

- To enroll, each player needs to deposit the right token amount, possibly zero. ✅
- To play, each Bob and Alice need to submit their unique move. ✅
- The contract decides and rewards the winner with all token wagered. ✅

There are many ways to implement this, so we leave that up to you.

## Stretch Goals

Nice to have, but not necessary.

- Make it a utility whereby any 2 people can decide to play against each other. ✅
- Reduce gas costs as much as possible. 😩 *** This is a little outside my current knowledge, I have tried my best ***
- Let players bet their previous winnings. ✅
- How can you entice players to play, knowing that they may have their funds stuck in the contract if they face an uncooperative player? ✅
- Include any tests using Hardhat. ✅

Now fork this repo and do it!

When you're done, please send an email to zak@slingshot.finance (if you're not applying through Homerun) with a link to your fork or join the [Slingshot Discord channel](https://discord.gg/JNUnqYjwmV) and let us know.

Happy hacking!
