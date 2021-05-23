pragma solidity ^0.4.25;

import "../node_modules/openzeppelin-solidity/contracts/math/SafeMath.sol";

contract FlightSuretyData {
    using SafeMath for uint256;

    /********************************************************************************************/
    /*                                       DATA VARIABLES                                     */
    /********************************************************************************************/
    uint8 private constant M = 4;

    address private contractOwner;                                      // Account used to deploy contract
    bool private operational = true;                                    // Blocks all state changes throughout the contract if false

    uint256 private funds = 0 ether;

    struct Airline {
        bool registered;
        bool funded;
    }

    mapping (address => Airline) airlines;
    uint8 private airlinesCount;

    struct Insurance {
        address passengersAddress;
        uint256 purchasedAmount;
    }

    mapping(bytes32 => Insurance[]) insurances;
    mapping(address => uint256) payouts;

    /********************************************************************************************/
    /*                                       EVENT DEFINITIONS                                  */
    /********************************************************************************************/


    /**
    * @dev Constructor
    *      The deploying account becomes contractOwner
    */
    constructor
                                (
                                )
                                public
    {
        contractOwner = msg.sender;
    }

    /********************************************************************************************/
    /*                                       FUNCTION MODIFIERS                                 */
    /********************************************************************************************/

    // Modifiers help avoid duplication of code. They are typically used to validate something
    // before a function is allowed to be executed.

    /**
    * @dev Modifier that requires the "operational" boolean variable to be "true"
    *      This is used on all state changing functions to pause the contract in 
    *      the event there is an issue that needs to be fixed
    */
    modifier requireIsOperational()
    {
        require(operational, "Contract is currently not operational");
        _;  // All modifiers require an "_" which indicates where the function body will be added
    }

    /**
    * @dev Modifier that requires the "ContractOwner" account to be the function caller
    */
    modifier requireContractOwner()
    {
        require(msg.sender == contractOwner, "Caller is not contract owner");
        _;
    }

    modifier requireAirlineRegistered()
    {
        require(isRegisteredAirline(msg.sender), "Caller is not registered");
        _;
    }

    /********************************************************************************************/
    /*                                       UTILITY FUNCTIONS                                  */
    /********************************************************************************************/

    /**
    * @dev Get operating status of contract
    *
    * @return A bool that is the current operating status
    */
    function isOperational()
                            external
                            returns(bool)
    {
        return operational;
    }


    /**
    * @dev Sets contract operations on/off
    *
    * When operational mode is disabled, all write transactions except for this one will fail
    */
    function setOperatingStatus
                            (
                                bool mode
                            )
                            external
                            requireContractOwner
    {
        operational = mode;
    }

    function isRegisteredAirline(address airline)
                            public
                            returns(bool)
    {
        return airlines[airline].registered;
    }

    function isAirlineFunded(address airline)
                            external
                            returns(bool)
    {
        return airlines[airline].funded;
    }

    function isMultipartyConsensusActive()
                    external
                    returns(bool)
    {
        return airlinesCount > M;
    }

    function getM()
                external
                returns (uint8)
    {
        return airlinesCount / 2;
    }

    /********************************************************************************************/
    /*                                     SMART CONTRACT FUNCTIONS                             */
    /********************************************************************************************/

   /**
    * @dev Add an airline to the registration queue
    *      Can only be called from FlightSuretyApp contract
    *
    */
    function registerAirline
                            (
                                address airline
                            )
                            external
    {
        airlines[airline].registered = true;
        airlinesCount = airlinesCount + 1;
    }


   /**
    * @dev Buy insurance for a flight
    *
    */
    function buy
                            (
                                address airline,
                                string flight,
                                uint256 timestamp
                            )
                            external
                            payable
    {
        bytes32 flightKey = getFlightKey(airline, flight, timestamp);

        insurances[flightKey].push(
            Insurance({
                passengersAddress: msg.sender,
                purchasedAmount: msg.value
            })
        );

        // add to funds
        funds = funds + msg.value;
    }

    /**
     *  @dev Credits payouts to insurees
    */
    function creditInsurees
                                (
                                    bytes32 flightKey
                                )
                                external
    {
        Insurance[] insurance = insurances[flightKey];
        for (uint i=0; i<insurance.length; i++) {
            uint256 purchasedAmount = insurance[i].purchasedAmount;
            uint256 payoutAmount = purchasedAmount * 3 / 2;
            require(funds >= payoutAmount, "There is not enough ETH to payout");
            funds = funds - payoutAmount;
            payouts[insurance[i].passengersAddress] = payoutAmount;
        }

    }


    /**
     *  @dev Transfers eligible payout funds to insuree
     *
    */
    function pay
                            (
                            )
                            external
    {
        require(payouts[msg.sender] > 0);
        uint256 prev = payouts[msg.sender];
        payouts[msg.sender] = 0;
        msg.sender.transfer(prev);
    }

   /**
    * @dev Initial funding for the insurance. Unless there are too many delayed flights
    *      resulting in insurance payouts, the contract should be self-sustaining
    *
    */
    function fund
                            (
                            )
                            public
                            payable
                            requireAirlineRegistered
    {
        require(msg.value >= 10, "You need to found 10 eth at least");

        funds = funds + msg.value;
        airlines[msg.sender].funded = true;
    }

    function getFlightKey
                        (
                            address airline,
                            string memory flight,
                            uint256 timestamp
                        )
                        pure
                        internal
                        returns(bytes32)
    {
        return keccak256(abi.encodePacked(airline, flight, timestamp));
    }

    /**
    * @dev Fallback function for funding smart contract.
    *
    */
    function()
                            external
                            payable
    {
        fund();
    }


}

