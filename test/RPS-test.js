const { expect, assert } = require("chai");

describe("SlingBux", function () {
    it("Assigns the correct balance to initial accounts", async function () {
        let player1, player2;
        [player1, player2, _] = await hre.ethers.getSigners();
        const SlingBux = await ethers.getContractFactory("SlingBux");
        const slingbux = await SlingBux.deploy(player1.address, player2.address);
        await slingbux.deployed();

        expect(await
            slingbux.balanceOf(player1.address)).to.equal("100000000000000000000");
    });
});

describe("Utility", function () {
    let player1, player2, Utility, utility, Slingbux, slingbux

    beforeEach(async() => {
        [player1, player2, _] = await hre.ethers.getSigners();
        Utility = await ethers.getContractFactory("Utility");
        utility = await Utility.deploy();
        await utility.deployed();
        SlingBux = await ethers.getContractFactory("SlingBux");
        slingbux = await SlingBux.deploy(player1.address, player2.address);
        await slingbux.deployed();

    });

    it("Should deploy correctly", async function () {
        expect(await
            utility.getGameCount()).to.equal("0");
    });

    it("Should keep track of all games, and let users start new games", async function () {
        await utility.startGame(player2.address, "1000000",slingbux.address);
        expect(await utility.getGameCount()).to.equal("1");
    });
});


describe("RPS", function () {
    let player1, player2, player3, SlingBux, slingbux, RPS, rps, p1, p2
    const allowance = "5000000000000000000";
    const buyIn = "1000000000000000000";
    let wining_commit = "0x5fdecc49c5614d4431222e6bd136397a7824bf642b12df46cd9a1e7cba75fdde"; //Hashed commit of "rockswag"
    let losing_commit = "0x86d6a1bbb2acdacbc5f74d52980a49717b41f7f8e484e2a43b43f6a7f65de636"; //Hashed commit of "scissors123123"
    let winning_reveal = ["rock", "swag"];
    let losing_reveal = ["scissors", '123123'];
    beforeEach(async () => {
        [player1, player2, player3, _] = await hre.ethers.getSigners();
        SlingBux = await ethers.getContractFactory("SlingBux");
        slingbux = await SlingBux.deploy(player1.address, player2.address);
        await slingbux.deployed();
        RPS = await ethers.getContractFactory("RPS");
        rps = await RPS.deploy(player1.address, player2.address, buyIn, slingbux.address);
        await rps.deployed();
        p1 = await rps.players(0);
        p2 = await rps.players(1);
        await slingbux.connect(player1).approve(rps.address, allowance);
        await slingbux.connect(player2).approve(rps.address, allowance);
    })

    it('Should setup the initial contract state according to constuctor variables', async function () {
        expect(await rps.buyIn()).to.equal(buyIn);
        expect(await p1.addr).to.equal(player1.address);
        expect(await p2.addr).to.equal(player2.address);
    });

    it('Should not let non-players make moves', async function () {
        expect(await rps.buyIn()).to.equal(buyIn);
        await expect(rps.connect(player3).commitMove(wining_commit)).to.be.reverted;
    });

    it('Should register player commits correctly and not allow reveal until after both commits', async function () {
        await rps.connect(player1).commitMove(wining_commit);
        await expect(rps.connect(player1).revealMove(...winning_reveal)).to.be.revertedWith("Both players must commit.");
        await rps.connect(player2).commitMove(losing_commit);
        p1 = await rps.players(0);
        p2 = await rps.players(1);
        expect(await p1.commit).to.equal(wining_commit);
        expect(await p2.commit).to.equal(losing_commit);
    });

    it('Should allow player1 to withdraw early if player2 has not made a move.', async function () {
        await rps.connect(player1).commitMove(wining_commit);
        await rps.connect(player1).withdrawStake();
        expect(await slingbux.balanceOf(player1.address)).to.equal("100000000000000000000");

    });

    it('Should only let initiating player withdraw early', async function () {
        await rps.connect(player1).commitMove(wining_commit);
        await expect(rps.connect(player2).withdrawStake()).to.be.revertedWith("Withdrawal Conditions not met.");
    });

    it('Should not allow player1 to withdraw early if player2 made a move.', async function () {
        await rps.connect(player1).commitMove(wining_commit);
        await rps.connect(player2).commitMove(losing_commit);
        await expect(rps.connect(player1).withdrawStake()).to.be.revertedWith("Withdrawal Conditions not met.");
    });

    it("Should not allow early withdrawals before time limit if opponent hasn't revealed", async function () {
        await rps.connect(player1).commitMove(wining_commit);
        await rps.connect(player2).commitMove(losing_commit);
        await rps.connect(player1).revealMove(...winning_reveal);
        await expect(rps.connect(player1).withdrawStake()).to.be.revertedWith("Withdrawal Conditions not met.");
    });

    it("Should allow early withdrawal after time limit if opponent hasn't revealed  ", async function () {
        await rps.connect(player1).commitMove(wining_commit);
        await rps.connect(player2).commitMove(losing_commit);
        await rps.connect(player1).revealMove(...winning_reveal);
        await network.provider.send("evm_increaseTime", [95040])//Increasing the time by 26.4 hrs
        await rps.connect(player1).withdrawStake();
        expect(await slingbux.balanceOf(player1.address)).to.equal("100000000000000000000");
    });

    it('Should not allow players to reveal using incorrect values', async function () {
        await rps.connect(player1).commitMove(wining_commit);
        await rps.connect(player2).commitMove(losing_commit);
        await expect(rps.connect(player1).revealMove(...losing_reveal)).to.be.revertedWith("Move doesn't match hash");
    });

    it('Should allow 0 wager games to take place and be completed', async function () {
        RPS = await ethers.getContractFactory("RPS");
        rps = await RPS.deploy(player1.address, player2.address, "0", slingbux.address);
        await rps.deployed();
        await rps.connect(player1).commitMove(wining_commit);
        await rps.connect(player2).commitMove(losing_commit);
        await rps.connect(player1).revealMove(...winning_reveal);
        await rps.connect(player2).revealMove(...losing_reveal);
        expect(await rps.gameIsLive()).to.equal(false);
        expect(await rps.winner()).to.equal(player1.address);
    });



    it('Should assign the correct winner and allow withdrawal when both reveals are made', async function () {
        await rps.connect(player1).commitMove(wining_commit);
        await rps.connect(player2).commitMove(losing_commit);
        await rps.connect(player1).revealMove(...winning_reveal);
        await rps.connect(player2).revealMove(...losing_reveal);
        expect(await rps.gameIsLive()).to.equal(false);
        expect(await rps.winner()).to.equal(player1.address);
        p1 = await rps.players(0);
        p2 = await rps.players(1);
        expect(await p1.winnings).to.equal("2000000000000000000");
        expect(await p2.winnings).to.equal("0");
        await rps.connect(player1).withdrawWinnings();
        p1 = await rps.players(0);
        expect(await p1.winnings).to.equal(0);
        expect(await slingbux.balanceOf(player1.address)).to.equal("101000000000000000000");
    });

    it('Should return the original buy in to both players in the case of a draw', async function () {
        await rps.connect(player1).commitMove(wining_commit);
        await rps.connect(player2).commitMove(wining_commit);
        await rps.connect(player1).revealMove(...winning_reveal);
        await rps.connect(player2).revealMove(...winning_reveal);
        p1 = await rps.players(0);
        p2 = await rps.players(1);
        expect(await p1.winnings).to.equal(buyIn);
        expect(await p2.winnings).to.equal(buyIn);
    });


    it('Should not allow a loser to withdraw the game winnings', async function () {
        await rps.connect(player1).commitMove(wining_commit);
        await rps.connect(player2).commitMove(losing_commit);
        await rps.connect(player1).revealMove(...winning_reveal);
        await rps.connect(player2).revealMove(...losing_reveal);
        await expect(rps.connect(player2).withdrawWinnings()).to.be.revertedWith("No winnings");
    });

    it('Should automatically assign the opposing player as the winner if an invalid move was made', async function () {
        let bad_commit = "0xfb2a8ed6c06d02e4b082114ed00dc0ef0edf0d7a958ec583c202b15d0871c0d2"; //Hashed commit of "invalid123"
        let bad_reveal = ["invalid","123"];
        await rps.connect(player1).commitMove(bad_commit);
        await expect(rps.connect(player1).revealMove(...winning_reveal)).to.be.revertedWith("Both players must commit.");
        await rps.connect(player2).commitMove(losing_commit);
        await rps.connect(player1).revealMove(...bad_reveal);
        expect(await rps.gameIsLive()).to.equal(false);
        expect(await rps.winner()).to.equal(player2.address);
    });

    it('Should not allow a rematch during a live game', async function () {
        await rps.connect(player1).commitMove(wining_commit);
        await rps.connect(player2).commitMove(losing_commit);
        await rps.connect(player1).revealMove(...winning_reveal);
        await expect(rps.connect(player2).rematch(0)).to.be.revertedWith("Finish existing game before starting a rematch");
    });

    it('Should allow either player to start a rematch and use their winnings to pay.', async function () {
        await rps.connect(player1).commitMove(wining_commit);
        await rps.connect(player2).commitMove(losing_commit);
        await rps.connect(player1).revealMove(...winning_reveal);
        await rps.connect(player2).revealMove(...losing_reveal);
        const priorSlingBuxBalance = await slingbux.balanceOf(player1.address);
        await rps.connect(player1).rematch(buyIn);
        expect(await rps.gameIsLive()).to.equal(true);
        expect(await rps.winner()).to.equal("0x0000000000000000000000000000000000000000");
        expect(await rps.players(0).commit).to.equal(undefined);
        expect(await rps.players(1).revealed).to.equal(undefined);
        p1 = await rps.players(0);
        expect(await p1.winnings).to.equal("1000000000000000000");
        expect(await slingbux.balanceOf(player1.address)).to.equal(priorSlingBuxBalance);
    });


    it('Should reward rematch winnings correctly.', async function () {
        await rps.connect(player1).commitMove(wining_commit);
        await rps.connect(player2).commitMove(losing_commit);
        await rps.connect(player1).revealMove(...winning_reveal);
        await rps.connect(player2).revealMove(...losing_reveal);
        await rps.connect(player1).rematch(buyIn);
        await rps.connect(player1).commitMove(losing_commit);
        await rps.connect(player2).commitMove(wining_commit);
        await rps.connect(player1).revealMove(...losing_reveal);
        await rps.connect(player2).revealMove(...winning_reveal);
        expect(await rps.winner()).to.equal(player2.address);
        p1 = await rps.players(0);
        p2 = await rps.players(1);
        expect(await p1.winnings).to.equal("1000000000000000000");
        expect(await p2.winnings).to.equal("2000000000000000000");
    });

    it('Should allow early withdrawal by initiator during rematch', async function () {
        await rps.connect(player1).commitMove(wining_commit);
        await rps.connect(player2).commitMove(losing_commit);
        await rps.connect(player1).revealMove(...winning_reveal);
        await rps.connect(player2).revealMove(...losing_reveal);
        await rps.connect(player1).rematch(buyIn);
        await rps.connect(player1).withdrawStake();
        p1 = await rps.players(0);
        expect(await p1.staked).to.equal(0);
        expect(await slingbux.balanceOf(player1.address)).to.equal("100000000000000000000");
    });

    it('Should function correctly with a new buyIn specified', async function () {
        await rps.connect(player1).commitMove(wining_commit);
        await rps.connect(player2).commitMove(losing_commit);
        await rps.connect(player1).revealMove(...winning_reveal);
        await rps.connect(player2).revealMove(...losing_reveal);
        const halfOriginalBuyIn = "500000000000000000";
        await rps.connect(player1).rematch(halfOriginalBuyIn);
        await rps.connect(player1).commitMove(losing_commit);
        await rps.connect(player2).commitMove(wining_commit);
        await rps.connect(player1).revealMove(...losing_reveal);
        await rps.connect(player2).revealMove(...winning_reveal);
        expect(await rps.winner()).to.equal(player2.address);
        p1 = await rps.players(0);
        p2 = await rps.players(1);
        expect(await p1.winnings).to.equal("1500000000000000000");
        expect(await p2.winnings).to.equal("1000000000000000000");
                                            
    });

})
