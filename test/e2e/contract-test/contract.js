/*global ethereum, MetamaskOnboarding, HumanStandardTokenContractCode PiggyBankContractCode keccak256*/

/*
The `piggybankContract` is compiled from:

  pragma solidity ^0.4.0;
  contract PiggyBank {

      uint private balance;
      address public owner;

      function PiggyBank() public {
          owner = msg.sender;
          balance = 0;
      }

      function deposit() public payable returns (uint) {
          balance += msg.value;
          return balance;
      }

      function withdraw(uint withdrawAmount) public returns (uint remainingBal) {
          require(msg.sender == owner);
          balance -= withdrawAmount;

          msg.sender.transfer(withdrawAmount);

          return balance;
      }
  }
*/

const forwarderOrigin = 'http://localhost:9010'

const isMetaMaskInstalled = () => {
  return Boolean(window.ethereum && window.ethereum.isMetaMask)
}

const initialize = () => {
  const onboardButton = document.getElementById('connectButton')
  const deployButton = document.getElementById('deployButton')
  const depositButton = document.getElementById('depositButton')
  const withdrawButton = document.getElementById('withdrawButton')
  const sendButton = document.getElementById('sendButton')
  const createToken = document.getElementById('createToken')
  const transferTokens = document.getElementById('transferTokens')
  const approveTokens = document.getElementById('approveTokens')
  const transferTokensWithoutGas = document.getElementById(
    'transferTokensWithoutGas'
  )
  const approveTokensWithoutGas = document.getElementById(
    'approveTokensWithoutGas'
  )
  const personalSignData = document.getElementById('personalSignData')
  const personalSignDataResults = document.getElementById(
    'personalSignDataResult'
  )
  const signTypedData = document.getElementById('signTypedData')
  const signTypedDataResults = document.getElementById('signTypedDataResult')
  const cfxSignData = document.getElementById('cfxSignData')
  const cfxSignDataResults = document.getElementById('cfxSignDataResult')
  const getAccountsButton = document.getElementById('getAccounts')
  const getAccountsResults = document.getElementById('getAccountsResult')

  const contractStatus = document.getElementById('contractStatus')
  const tokenAddress = document.getElementById('tokenAddress')
  const networkDiv = document.getElementById('network')
  const chainIdDiv = document.getElementById('chainId')
  const accountsDiv = document.getElementById('accounts')

  let onboarding
  try {
    onboarding = new MetamaskOnboarding({ forwarderOrigin })
  } catch (error) {
    console.error(error)
  }
  let accounts
  let piggybankContract

  const accountButtons = [
    deployButton,
    depositButton,
    withdrawButton,
    sendButton,
    createToken,
    transferTokens,
    approveTokens,
    transferTokensWithoutGas,
    approveTokensWithoutGas,
    personalSignData,
    signTypedData,
    cfxSignData,
  ]

  const isMetaMaskConnected = () => accounts && accounts.length > 0

  const onClickInstall = () => {
    onboardButton.innerText = 'Onboarding in progress'
    onboardButton.disabled = true
    onboarding.startOnboarding()
  }

  const onClickConnect = async () => {
    await window.ethereum.enable()
  }

  const updateButtons = () => {
    const accountButtonsDisabled =
      !isMetaMaskInstalled() || !isMetaMaskConnected()
    if (accountButtonsDisabled) {
      for (const button of accountButtons) {
        button.disabled = true
      }
    } else {
      deployButton.disabled = false
      sendButton.disabled = false
      createToken.disabled = false
      personalSignData.disabled = false
      cfxSignData.disabled = false
      signTypedData.disabled = false
    }

    if (!isMetaMaskInstalled()) {
      onboardButton.innerText = 'Click here to install MetaMask!'
      onboardButton.onclick = onClickInstall
      onboardButton.disabled = false
    } else if (isMetaMaskConnected()) {
      onboardButton.innerText = 'Connected'
      onboardButton.disabled = true
      if (onboarding) {
        onboarding.stopOnboarding()
      }
    } else {
      onboardButton.innerText = 'Connect'
      onboardButton.onclick = onClickConnect
      onboardButton.disabled = false
    }
  }

  const initializeAccountButtons = () => {
    piggybankContract = web3.Contract({
      abi: [
        {
          constant: false,
          inputs: [{ name: 'withdrawAmount', type: 'uint256' }],
          name: 'withdraw',
          outputs: [{ name: 'remainingBal', type: 'uint256' }],
          payable: false,
          stateMutability: 'nonpayable',
          type: 'function',
        },
        {
          constant: true,
          inputs: [],
          name: 'owner',
          outputs: [{ name: '', type: 'address' }],
          payable: false,
          stateMutability: 'view',
          type: 'function',
        },
        {
          constant: false,
          inputs: [],
          name: 'deposit',
          outputs: [{ name: '', type: 'uint256' }],
          payable: true,
          stateMutability: 'payable',
          type: 'function',
        },
        {
          inputs: [],
          payable: false,
          stateMutability: 'nonpayable',
          type: 'constructor',
        },
      ],
      code: PiggyBankContractCode,
    })
    deployButton.onclick = async () => {
      contractStatus.innerHTML = 'Deploying'

      const piggybank = await piggybankContract
        .constructor()
        .sendTransaction({
          from: accounts[0],
          gas: '4700000',
        })
        .confirmed()
        .catch(error => {
          contractStatus.innerHTML = 'Deployment Failed'
          throw error
        })

      if (piggybank.contractCreated === undefined) {
        return
      }

      piggybankContract.address = piggybank.contractCreated

      console.log(
        'Contract mined! address: ' +
          piggybank.address +
          ' transactionHash: ' +
          piggybank.transactionHash
      )

      depositButton.onclick = async () => {
        contractStatus.innerHTML = 'Deposit initiated'
        console.log(piggybankContract.deposit())
        const depositResult = await piggybankContract
          .deposit()
          .sendTransaction({ value: '0x3782dace9d900000', from: accounts[0] })
          .confirmed()
        console.log(depositResult)
        contractStatus.innerHTML = 'Deposit completed'
      }

      withdrawButton.onclick = async () => {
        const withdrawResult = await piggybankContract
          .withdraw('0xde0b6b3a7640000')
          .sendTransaction({ from: accounts[0] })
          .confirmed()
        console.log(withdrawResult)
        contractStatus.innerHTML = 'Withdrawn'
      }

      contractStatus.innerHTML = 'Deployed'
      depositButton.disabled = false
      withdrawButton.disabled = false

      console.log(piggybank)
    }

    sendButton.onclick = async () => {
      const txResult = await web3
        .sendTransaction({
          from: accounts[0],
          to: accounts[0],
          value: '0x29a2241af62c0000',
          gas: 21000,
          gasPrice: 20000000000,
        })
        .confirmed()
      console.log(txResult)
    }

    createToken.onclick = async () => {
      const _initialAmount = 100
      const _tokenName = 'TST'
      const _decimalUnits = 0
      const _tokenSymbol = 'TST'
      const humanstandardtokenContract = web3.Contract({
        abi: [
          {
            constant: true,
            inputs: [],
            name: 'name',
            outputs: [{ name: '', type: 'string' }],
            payable: false,
            stateMutability: 'view',
            type: 'function',
          },
          {
            constant: false,
            inputs: [
              { name: '_spender', type: 'address' },
              { name: '_value', type: 'uint256' },
            ],
            name: 'approve',
            outputs: [{ name: 'success', type: 'bool' }],
            payable: false,
            stateMutability: 'nonpayable',
            type: 'function',
          },
          {
            constant: true,
            inputs: [],
            name: 'totalSupply',
            outputs: [{ name: '', type: 'uint256' }],
            payable: false,
            stateMutability: 'view',
            type: 'function',
          },
          {
            constant: false,
            inputs: [
              { name: '_from', type: 'address' },
              { name: '_to', type: 'address' },
              { name: '_value', type: 'uint256' },
            ],
            name: 'transferFrom',
            outputs: [{ name: 'success', type: 'bool' }],
            payable: false,
            stateMutability: 'nonpayable',
            type: 'function',
          },
          {
            constant: true,
            inputs: [],
            name: 'decimals',
            outputs: [{ name: '', type: 'uint8' }],
            payable: false,
            stateMutability: 'view',
            type: 'function',
          },
          {
            constant: true,
            inputs: [],
            name: 'version',
            outputs: [{ name: '', type: 'string' }],
            payable: false,
            stateMutability: 'view',
            type: 'function',
          },
          {
            constant: true,
            inputs: [{ name: '_owner', type: 'address' }],
            name: 'balanceOf',
            outputs: [{ name: 'balance', type: 'uint256' }],
            payable: false,
            stateMutability: 'view',
            type: 'function',
          },
          {
            constant: true,
            inputs: [],
            name: 'symbol',
            outputs: [{ name: '', type: 'string' }],
            payable: false,
            stateMutability: 'view',
            type: 'function',
          },
          {
            constant: false,
            inputs: [
              { name: '_to', type: 'address' },
              { name: '_value', type: 'uint256' },
            ],
            name: 'transfer',
            outputs: [{ name: 'success', type: 'bool' }],
            payable: false,
            stateMutability: 'nonpayable',
            type: 'function',
          },
          {
            constant: false,
            inputs: [
              { name: '_spender', type: 'address' },
              { name: '_value', type: 'uint256' },
              { name: '_extraData', type: 'bytes' },
            ],
            name: 'approveAndCall',
            outputs: [{ name: 'success', type: 'bool' }],
            payable: false,
            stateMutability: 'nonpayable',
            type: 'function',
          },
          {
            constant: true,
            inputs: [
              { name: '_owner', type: 'address' },
              { name: '_spender', type: 'address' },
            ],
            name: 'allowance',
            outputs: [{ name: 'remaining', type: 'uint256' }],
            payable: false,
            stateMutability: 'view',
            type: 'function',
          },
          {
            inputs: [
              { name: '_initialAmount', type: 'uint256' },
              { name: '_tokenName', type: 'string' },
              { name: '_decimalUnits', type: 'uint8' },
              { name: '_tokenSymbol', type: 'string' },
            ],
            payable: false,
            stateMutability: 'nonpayable',
            type: 'constructor',
          },
          { payable: false, stateMutability: 'nonpayable', type: 'fallback' },
          {
            anonymous: false,
            inputs: [
              { indexed: true, name: '_from', type: 'address' },
              { indexed: true, name: '_to', type: 'address' },
              { indexed: false, name: '_value', type: 'uint256' },
            ],
            name: 'Transfer',
            type: 'event',
          },
          {
            anonymous: false,
            inputs: [
              { indexed: true, name: '_owner', type: 'address' },
              { indexed: true, name: '_spender', type: 'address' },
              { indexed: false, name: '_value', type: 'uint256' },
            ],
            name: 'Approval',
            type: 'event',
          },
        ],
        code: HumanStandardTokenContractCode,
      })

      const humanstandardtoken = await humanstandardtokenContract
        .constructor(_initialAmount, _tokenName, _decimalUnits, _tokenSymbol)
        .sendTransaction({
          from: accounts[0],
          gas: '4700000',
          gasPrice: '20000000000',
        })
        .confirmed()
        .catch(error => {
          tokenAddress.innerHTML = 'Creation Failed'
          throw error
        })

      if (humanstandardtoken.contractCreated === undefined) {
        return
      }

      humanstandardtokenContract.address = humanstandardtoken.contractCreated

      console.log(
        'Contract mined! address: ' +
          humanstandardtoken.contractCreated +
          ' transactionHash: ' +
          humanstandardtoken.transactionHash
      )

      tokenAddress.innerHTML = humanstandardtoken.contractCreated
      transferTokens.disabled = false
      approveTokens.disabled = false
      transferTokensWithoutGas.disabled = false
      approveTokensWithoutGas.disabled = false

      transferTokens.onclick = async event => {
        console.log(`event`, event)
        const transferResult = humanstandardtokenContract
          .transfer('0x2f318C334780961FB129D2a6c30D0763d9a5C970', '15000')
          .sendTransaction({
            from: accounts[0],
            to: humanstandardtokenContract.address,
            data:
              '0xa9059cbb0000000000000000000000002f318c334780961fb129d2a6c30d0763d9a5c9700000000000000000000000000000000000000000000000000000000000003a98',
            gas: 60000,
            gasPrice: '20000000000',
          })
          .confirmed()
        console.log(transferResult)
      }

      approveTokens.onclick = async () => {
        const approveResult = await humanstandardtokenContract
          .approve('0x9bc5baF874d2DA8D216aE9f137804184EE5AfEF4', '70000')
          .sendTransaction({
            from: accounts[0],
            to: humanstandardtokenContract.address,
            data:
              '0x095ea7b30000000000000000000000009bc5baF874d2DA8D216aE9f137804184EE5AfEF40000000000000000000000000000000000000000000000000000000000000005',
            gas: 60000,
            gasPrice: '20000000000',
          })
          .confirmed()
        console.log(approveResult)
      }

      transferTokensWithoutGas.onclick = async event => {
        console.log(`event`, event)
        const transferResult = await humanstandardtokenContract
          .transfer('0x2f318C334780961FB129D2a6c30D0763d9a5C970', '15000')
          .sendTransaction({
            from: accounts[0],
            to: humanstandardtokenContract.address,
            data:
              '0xa9059cbb0000000000000000000000002f318c334780961fb129d2a6c30d0763d9a5c9700000000000000000000000000000000000000000000000000000000000003a98',
            gasPrice: '20000000000',
          })
          .confirmed()
        console.log(transferResult)
      }

      approveTokensWithoutGas.onclick = async () => {
        const approveResult = await humanstandardtokenContract
          .approve('0x2f318C334780961FB129D2a6c30D0763d9a5C970', '70000')
          .sendTransaction({
            from: accounts[0],
            to: humanstandardtokenContract.address,
            data:
              '0x095ea7b30000000000000000000000002f318C334780961FB129D2a6c30D0763d9a5C9700000000000000000000000000000000000000000000000000000000000000005',
            gasPrice: '20000000000',
          })
          .confirmed()
        console.log(approveResult)
      }
    }

    personalSignData.addEventListener('click', () => {
      const typedData = {
        types: {
          EIP712Domain: [
            { name: 'name', type: 'string' },
            { name: 'version', type: 'string' },
            { name: 'chainId', type: 'uint256' },
            { name: 'verifyingContract', type: 'address' },
          ],
          Person: [
            { name: 'name', type: 'string' },
            { name: 'wallet', type: 'address' },
          ],
          Mail: [
            { name: 'from', type: 'Person' },
            { name: 'to', type: 'Person' },
            { name: 'contents', type: 'string' },
          ],
        },
        primaryType: 'Mail',
        domain: {
          name: 'Ether Mail',
          version: '1',
          chainId: 3,
          verifyingContract: '0xCcCCccccCCCCcCCCCCCcCcCccCcCCCcCcccccccC',
        },
        message: {
          sender: {
            name: 'Cow',
            wallet: '0xCD2a3d9F938E13CD947Ec05AbC7FE734Df8DD826',
          },
          recipient: {
            name: 'Bob',
            wallet: '0xbBbBBBBbbBBBbbbBbbBbbbbBBbBbbbbBbBbbBBbB',
          },
          contents: 'Hello, Bob!',
        },
      }

      web3.provider.sendAsync(
        {
          method: 'personal_sign',
          params: [JSON.stringify(typedData), ethereum.selectedAddress],
          from: ethereum.selectedAddress,
        },
        (err, result) => {
          if (err) {
            console.log(err)
          } else {
            if (result.warning) {
              console.warn(result.warning)
            }
            personalSignDataResults.innerHTML = JSON.stringify(result)
          }
        }
      )
    })

    cfxSignData.addEventListener('click', () => {
      const typedData = {
        types: {
          EIP712Domain: [
            { name: 'name', type: 'string' },
            { name: 'version', type: 'string' },
            { name: 'chainId', type: 'uint256' },
            { name: 'verifyingContract', type: 'address' },
          ],
          Person: [
            { name: 'name', type: 'string' },
            { name: 'wallet', type: 'address' },
          ],
          Mail: [
            { name: 'from', type: 'Person' },
            { name: 'to', type: 'Person' },
            { name: 'contents', type: 'string' },
          ],
        },
        primaryType: 'Mail',
        domain: {
          name: 'Ether Mail',
          version: '1',
          chainId: 3,
          verifyingContract: '0xCcCCccccCCCCcCCCCCCcCcCccCcCCCcCcccccccC',
        },
        message: {
          sender: {
            name: 'Cow',
            wallet: '0xCD2a3d9F938E13CD947Ec05AbC7FE734Df8DD826',
          },
          recipient: {
            name: 'Bob',
            wallet: '0xbBbBBBBbbBBBbbbBbbBbbbbBBbBbbbbBbBbbBBbB',
          },
          contents: 'Hello, Bob!',
        },
      }

      web3.provider.sendAsync(
        {
          method: 'cfx_sign',
          params: [
            ethereum.selectedAddress,
            keccak256.digest(JSON.stringify(typedData)),
          ],
          from: ethereum.selectedAddress,
        },
        (err, result) => {
          if (err) {
            console.log(err)
          } else {
            if (result.warning) {
              console.warn(result.warning)
            }
            cfxSignDataResults.innerHTML = JSON.stringify(result)
          }
        }
      )
    })

    signTypedData.addEventListener('click', () => {
      const typedData = {
        types: {
          EIP712Domain: [
            { name: 'name', type: 'string' },
            { name: 'version', type: 'string' },
            { name: 'chainId', type: 'uint256' },
            { name: 'verifyingContract', type: 'address' },
          ],
          Person: [
            { name: 'name', type: 'string' },
            { name: 'wallet', type: 'address' },
          ],
          Mail: [
            { name: 'from', type: 'Person' },
            { name: 'to', type: 'Person' },
            { name: 'contents', type: 'string' },
          ],
        },
        primaryType: 'Mail',
        domain: {
          name: 'Ether Mail',
          version: '1',
          chainId: 3,
          verifyingContract: '0xCcCCccccCCCCcCCCCCCcCcCccCcCCCcCcccccccC',
        },
        message: {
          sender: {
            name: 'Cow',
            wallet: '0xCD2a3d9F938E13CD947Ec05AbC7FE734Df8DD826',
          },
          recipient: {
            name: 'Bob',
            wallet: '0xbBbBBBBbbBBBbbbBbbBbbbbBBbBbbbbBbBbbBBbB',
          },
          contents: 'Hello, Bob!',
        },
      }

      web3.provider.sendAsync(
        {
          method: 'eth_signTypedData_v3',
          params: [ethereum.selectedAddress, JSON.stringify(typedData)],
          from: ethereum.selectedAddress,
        },
        (err, result) => {
          if (err) {
            console.log(err)
          } else {
            signTypedDataResults.innerHTML = JSON.stringify(result)
          }
        }
      )
    })

    getAccountsButton.addEventListener('click', async () => {
      try {
        const accounts = await ethereum.send({ method: 'eth_accounts' })
        getAccountsResults.innerHTML = accounts[0] || 'Not able to get accounts'
      } catch (error) {
        console.error(error)
        getAccountsResults.innerHTML = `Error: ${error}`
      }
    })
  }

  updateButtons()
  if (isMetaMaskInstalled()) {
    ethereum.autoRefreshOnNetworkChange = false
    ethereum.on('networkChanged', networkId => {
      networkDiv.innerHTML = networkId
    })
    ethereum.on('chainIdChanged', chainId => {
      chainIdDiv.innerHTML = chainId
    })
    ethereum.on('accountsChanged', newAccounts => {
      const connecting = Boolean(
        (!accounts || !accounts.length) && newAccounts && newAccounts.length
      )
      accounts = newAccounts
      accountsDiv.innerHTML = accounts
      if (connecting) {
        initializeAccountButtons()
      }
      updateButtons()
    })
  }
}
window.addEventListener('DOMContentLoaded', initialize)
