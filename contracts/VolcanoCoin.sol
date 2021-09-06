// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract VolcanoCoin is ERC20, AccessControl {
    bytes32 public constant OWNER_ROLE = keccak256("OWNER_ROLE");
    
    constructor(address admin) ERC20("VolcanoCoin", "VLC") {
        _setupRole(OWNER_ROLE, msg.sender);
        _setupRole(DEFAULT_ADMIN_ROLE, admin);
        _mint(msg.sender, 10000 ether);
    }
    
    struct Payment {
        uint id;
        address recipient;
        uint amount;
        PaymentTypes paymentType;
        string comment;
        uint blockNumber;
    }
    
    enum PaymentTypes {
        Unknown,
        BasicPayment,
        Refund,
        Dividend,
        GroupPayment
    }
    
    uint currentPaymentId;
    mapping(address => Payment[]) public payments;
    
    struct Record {
        address sender;
        uint arrayIndex;
    }
    mapping(uint => Record) public paymentsFromId;
    
    /**
     * @dev transfers tokens to the specified address and creates a payment record.
     * @param _to the recipient of the transfer
     * @param _amount the amount transferred
     * @return true if the transfer is successful
     */
    function transfer(address _to, uint _amount) public override returns (bool) {
        _transfer(msg.sender, _to, _amount);
        
        //record the payment...
        payments[msg.sender].push(Payment({
            id: currentPaymentId,
            //sender: msg.sender,
            recipient: _to,
            amount: _amount,
            paymentType: PaymentTypes.Unknown,
            comment: "",
            blockNumber: block.number
        }));
        //...and save the array index that we will use to retrieve it
        paymentsFromId[currentPaymentId] = Record({sender: msg.sender, arrayIndex: payments[msg.sender].length-1});
        
        currentPaymentId++;
        
        return true;
    }
        
    /**
     * @dev grants the owner an amount of tokens equivalent to the current total supply
     */
    function increaseSupply() external onlyRole(OWNER_ROLE) {
        _mint(msg.sender, totalSupply());
    }
    
    /**
     * @dev updates details of a payment
     * @param _id the id of the payment
     * @param _type the type of payment
     * @param _comment a comment
     */
    function updateDetails(uint _id, PaymentTypes _type, string calldata _comment) public {
        require(_id < currentPaymentId, "this id doesn't exist");
        require(uint(_type) < 5, "invalid payment type");
        
        Record memory _record = paymentsFromId[_id];
        if (!hasRole(DEFAULT_ADMIN_ROLE, msg.sender))
            require(_record.sender == msg.sender, "this payment is not yours to edit");
        
        Payment storage _payment = payments[_record.sender][_record.arrayIndex];
        _payment.paymentType = _type;
        _payment.comment = _record.sender == msg.sender ? _comment : string(abi.encodePacked(_comment, ' (updated by admin)'));
    }
    
}