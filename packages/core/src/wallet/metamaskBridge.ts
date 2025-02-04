import type {
  IStarknetWindowObject,
  RpcMessage,
  StarknetWindowObject,
  WalletEvents,
} from "../StarknetWindowObject"
import wallets, { WalletProvider } from "../discovery"
import { init, loadRemote } from "@module-federation/runtime"

interface MetaMaskProvider {
  isMetaMask: boolean
  request(options: { method: string }): Promise<string[]>
}

function isMetaMaskProvider(obj: unknown): obj is MetaMaskProvider {
  return (
    obj !== null &&
    typeof obj === "object" &&
    obj.hasOwnProperty("isMetaMask") &&
    obj.hasOwnProperty("request")
  )
}

function detectMetaMaskProvider(
  windowObject: Record<string, unknown>,
  { timeout = 3000 } = {},
): Promise<MetaMaskProvider | null> {
  let handled = false
  return new Promise<MetaMaskProvider | null>((resolve) => {
    const handleEIP6963Provider = (event: CustomEvent) => {
      const { info, provider } = event.detail
      if (
        ["io.metamask", "io.metamask.flask"].includes(info.rdns) &&
        isMetaMaskProvider(provider)
      ) {
        resolve(provider)
        handled = true
      }
    }

    if (typeof windowObject.addEventListener === "function") {
      windowObject.addEventListener(
        "eip6963:announceProvider",
        handleEIP6963Provider,
      )
    }

    setTimeout(() => {
      if (!handled) {
        resolve(null)
      }
    }, timeout)

    // Notify event listeners and other parts of the dapp that a provider is requested.
    if (typeof windowObject.dispatchEvent === "function") {
      windowObject.dispatchEvent(new Event("eip6963:requestProvider"))
    }
  })
}

async function waitForMetaMaskProvider(
  windowObject: Record<string, unknown>,
  { timeout = 3000, retries = 0 } = {},
): Promise<MetaMaskProvider | null> {
  return detectMetaMaskProvider(windowObject, { timeout })
    .catch(function () {
      return null
    })
    .then(function (provider) {
      if (provider || retries === 0) {
        return provider
      }
      return waitForMetaMaskProvider(windowObject, {
        timeout,
        retries: retries - 1,
      })
    })
}

async function detectMetamaskSupport(windowObject: Record<string, unknown>) {
  const provider = await waitForMetaMaskProvider(windowObject, { retries: 3 })
  return provider
}

async function fetchMetaMaskSnapWallet(provider: unknown) {
  await init({
    name: "MetaMaskStarknetSnapWallet",
    remotes: [
      {
        name: "MetaMaskStarknetSnapWallet",
        alias: "MetaMaskStarknetSnapWallet",
        entry:
          "https://snaps.consensys.io/starknet/get-starknet/v1/remoteEntry.js", //"http://localhost:8082/remoteEntry.js",
      },
    ],
  })

  const result = await loadRemote("MetaMaskStarknetSnapWallet/index")

  console.log("result", result)

  const { MetaMaskSnapWallet } = result as {
    MetaMaskSnapWallet: any
    MetaMaskSnap: any
  }

  const metaMaskSnapWallet = new MetaMaskSnapWallet(provider, "*")

  return metaMaskSnapWallet as IStarknetWindowObject
}

// TODO: Üstteki Metamask snap wallet gibi bir fonksiyon yazılacak ve ya result as {MetaMaskSnapWallet: any, MetaMaskSnap: any} gibi atama yapılması gerekiyor. result as {metamaskaccount, metamasksigner} olabilir

//* Bu resulttaki metamaskAccount
// MetaMaskAccount: class c
// length: 5
// name: "c"
// prototype: Qr
// constructor: class c
// declare: ƒ async declare(e,t)
// execute: ƒ async execute(e,t,a)
// signMessage: ƒ async signMessage(e)
// [[Prototype]]: mr
// arguments: (...)
// caller: (...)
// [[FunctionLocation]]: 783.0999edcce2c3ff97…56a19c615b1f24202:1
// [[Prototype]]: class extends
// [[Scopes]]: Scopes[2]

//* Bu resulttaki metamask snap wallet
// pollingDelayMs: 100
// pollingTimeoutMs: 5000
// snapId: "npm:@consensys/starknet-snap"
// snapVersion: "3.1.0"
// length: 1
// name: "k"
// prototype:
// account: [Exception: TypeError: Cannot read private member from an object whose class did not declare it at https://snaps.consensys.io/starknet/get-starknet/v1/783.0999edcce2c3ff9734fb.js?v=a1356a19c615b1f24202:1:22837 at get account (https://snaps.consensys.io/starknet/get-starknet/v1/783.0999edcce2c3ff9734fb.js?v=a1356a19c615b1f24202:1:25300) at Object.invokeGetter (<anonymous>:3:28)]
// chainId: [Exception: TypeError: Cannot read private member from an object whose class did not declare it at https://snaps.consensys.io/starknet/get-starknet/v1/783.0999edcce2c3ff9734fb.js?v=a1356a19c615b1f24202:1:22837 at get chainId (https://snaps.consensys.io/starknet/get-starknet/v1/783.0999edcce2c3ff9734fb.js?v=a1356a19c615b1f24202:1:25781) at Object.invokeGetter (<anonymous>:3:28)]
// constructor: class k
// enable: ƒ async enable()
// init: async init(e=!0){e?await this.lock.runExclusive((async()=> {…}
// isPreauthorized: ƒ async isPreauthorized()
// off: ƒ off(e,t)
// on: ƒ on(e,t)
// provider: (...)
// request: ƒ async request(e)
// selectedAddress: (...)
// get account: ƒ account()
// get chainId: ƒ chainId()
// get provider: ƒ provider()
// get selectedAddress: ƒ selectedAddress()
// [[Prototype]]: Object
// arguments: (...)
// caller: (...)
// [[FunctionLocation]]: 783.0999edcce2c3ff97…56a19c615b1f24202:1
// [[Prototype]]: ƒ ()
// [[Scopes]]: Scopes[3]
// __esModule: true
// Symbol(mf_module_id): "MetaMaskStarknetSnapWallet/index"

//* createMetaMaskProviderWrapper snap wallet
// icon: "data:image/svg+xml;utf8;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyMTIiIGhlaWdodD0iMTg5IiB2aWV3Qm94PSIwIDAgMjEyIDE4OSI+PGcgZmlsbD0ibm9uZSIgZmlsbC1ydWxlPSJldmVub2RkIj48cG9seWdvbiBmaWxsPSIjQ0RCREIyIiBwb2ludHM9IjYwLjc1IDE3My4yNSA4OC4zMTMgMTgwLjU2MyA4OC4zMTMgMTcxIDkwLjU2MyAxNjguNzUgMTA2LjMxMyAxNjguNzUgMTA2LjMxMyAxODAgMTA2LjMxMyAxODcuODc1IDg5LjQzOCAxODcuODc1IDY4LjYyNSAxNzguODc1Ii8+PHBvbHlnb24gZmlsbD0iI0NEQkRCMiIgcG9pbnRzPSIxMDUuNzUgMTczLjI1IDEzMi43NSAxODAuNTYzIDEzMi43NSAxNzEgMTM1IDE2OC43NSAxNTAuNzUgMTY4Ljc1IDE1MC43NSAxODAgMTUwLjc1IDE4Ny44NzUgMTMzLjg3NSAxODcuODc1IDExMy4wNjMgMTc4Ljg3NSIgdHJhbnNmb3JtPSJtYXRyaXgoLTEgMCAwIDEgMjU2LjUgMCkiLz48cG9seWdvbiBmaWxsPSIjMzkzOTM5IiBwb2ludHM9IjkwLjU2MyAxNTIuNDM4IDg4LjMxMyAxNzEgOTEuMTI1IDE2OC43NSAxMjAuMzc1IDE2OC43NSAxMjMuNzUgMTcxIDEyMS41IDE1Mi40MzggMTE3IDE0OS42MjUgOTQuNSAxNTAuMTg4Ii8+PHBvbHlnb24gZmlsbD0iI0Y4OUMzNSIgcG9pbnRzPSI3NS4zNzUgMjcgODguODc1IDU4LjUgOTUuMDYzIDE1MC4xODggMTE3IDE1MC4xODggMTIzLjc1IDU4LjUgMTM2LjEyNSAyNyIvPjxwb2x5Z29uIGZpbGw9IiNGODlEMzUiIHBvaW50cz0iMTYuMzEzIDk2LjE4OCAuNTYzIDE0MS43NSAzOS45MzggMTM5LjUgNjUuMjUgMTM5LjUgNjUuMjUgMTE5LjgxMyA2NC4xMjUgNzkuMzEzIDU4LjUgODMuODEzIi8+PHBvbHlnb24gZmlsbD0iI0Q4N0MzMCIgcG9pbnRzPSI0Ni4xMjUgMTAxLjI1IDkyLjI1IDEwMi4zNzUgODcuMTg4IDEyNiA2NS4yNSAxMjAuMzc1Ii8+PHBvbHlnb24gZmlsbD0iI0VBOEQzQSIgcG9pbnRzPSI0Ni4xMjUgMTAxLjgxMyA2NS4yNSAxMTkuODEzIDY1LjI1IDEzNy44MTMiLz48cG9seWdvbiBmaWxsPSIjRjg5RDM1IiBwb2ludHM9IjY1LjI1IDEyMC4zNzUgODcuNzUgMTI2IDk1LjA2MyAxNTAuMTg4IDkwIDE1MyA2NS4yNSAxMzguMzc1Ii8+PHBvbHlnb24gZmlsbD0iI0VCOEYzNSIgcG9pbnRzPSI2NS4yNSAxMzguMzc1IDYwLjc1IDE3My4yNSA5MC41NjMgMTUyLjQzOCIvPjxwb2x5Z29uIGZpbGw9IiNFQThFM0EiIHBvaW50cz0iOTIuMjUgMTAyLjM3NSA5NS4wNjMgMTUwLjE4OCA4Ni42MjUgMTI1LjcxOSIvPjxwb2x5Z29uIGZpbGw9IiNEODdDMzAiIHBvaW50cz0iMzkuMzc1IDEzOC45MzggNjUuMjUgMTM4LjM3NSA2MC43NSAxNzMuMjUiLz48cG9seWdvbiBmaWxsPSIjRUI4RjM1IiBwb2ludHM9IjEyLjkzOCAxODguNDM4IDYwLjc1IDE3My4yNSAzOS4zNzUgMTM4LjkzOCAuNTYzIDE0MS43NSIvPjxwb2x5Z29uIGZpbGw9IiNFODgyMUUiIHBvaW50cz0iODguODc1IDU4LjUgNjQuNjg4IDc4Ljc1IDQ2LjEyNSAxMDEuMjUgOTIuMjUgMTAyLjkzOCIvPjxwb2x5Z29uIGZpbGw9IiNERkNFQzMiIHBvaW50cz0iNjAuNzUgMTczLjI1IDkwLjU2MyAxNTIuNDM4IDg4LjMxMyAxNzAuNDM4IDg4LjMxMyAxODAuNTYzIDY4LjA2MyAxNzYuNjI1Ii8+PHBvbHlnb24gZmlsbD0iI0RGQ0VDMyIgcG9pbnRzPSIxMjEuNSAxNzMuMjUgMTUwLjc1IDE1Mi40MzggMTQ4LjUgMTcwLjQzOCAxNDguNSAxODAuNTYzIDEyOC4yNSAxNzYuNjI1IiB0cmFuc2Zvcm09Im1hdHJpeCgtMSAwIDAgMSAyNzIuMjUgMCkiLz48cG9seWdvbiBmaWxsPSIjMzkzOTM5IiBwb2ludHM9IjcwLjMxMyAxMTIuNSA2NC4xMjUgMTI1LjQzOCA4Ni4wNjMgMTE5LjgxMyIgdHJhbnNmb3JtPSJtYXRyaXgoLTEgMCAwIDEgMTUwLjE4OCAwKSIvPjxwb2x5Z29uIGZpbGw9IiNFODhGMzUiIHBvaW50cz0iMTIuMzc1IC41NjMgODguODc1IDU4LjUgNzUuOTM4IDI3Ii8+PHBhdGggZmlsbD0iIzhFNUEzMCIgZD0iTTEyLjM3NTAwMDIsMC41NjI1MDAwMDggTDIuMjUwMDAwMDMsMzEuNTAwMDAwNSBMNy44NzUwMDAxMiw2NS4yNTAwMDEgTDMuOTM3NTAwMDYsNjcuNTAwMDAxIEw5LjU2MjUwMDE0LDcyLjU2MjUgTDUuMDYyNTAwMDgsNzYuNTAwMDAxMSBMMTEuMjUsODIuMTI1MDAxMiBMNy4zMTI1MDAxMSw4NS41MDAwMDEzIEwxNi4zMTI1MDAyLDk2Ljc1MDAwMTQgTDU4LjUwMDAwMDksODMuODEyNTAxMiBDNzkuMTI1MDAxMiw2Ny4zMTI1MDA0IDg5LjI1MDAwMTMsNTguODc1MDAwMyA4OC44NzUwMDEzLDU4LjUwMDAwMDkgQzg4LjUwMDAwMTMsNTguMTI1MDAwOSA2My4wMDAwMDA5LDM4LjgxMjUwMDYgMTIuMzc1MDAwMiwwLjU2MjUwMDAwOCBaIi8+PGcgdHJhbnNmb3JtPSJtYXRyaXgoLTEgMCAwIDEgMjExLjUgMCkiPjxwb2x5Z29uIGZpbGw9IiNGODlEMzUiIHBvaW50cz0iMTYuMzEzIDk2LjE4OCAuNTYzIDE0MS43NSAzOS45MzggMTM5LjUgNjUuMjUgMTM5LjUgNjUuMjUgMTE5LjgxMyA2NC4xMjUgNzkuMzEzIDU4LjUgODMuODEzIi8+PHBvbHlnb24gZmlsbD0iI0Q4N0MzMCIgcG9pbnRzPSI0Ni4xMjUgMTAxLjI1IDkyLjI1IDEwMi4zNzUgODcuMTg4IDEyNiA2NS4yNSAxMjAuMzc1Ii8+PHBvbHlnb24gZmlsbD0iI0VBOEQzQSIgcG9pbnRzPSI0Ni4xMjUgMTAxLjgxMyA2NS4yNSAxMTkuODEzIDY1LjI1IDEzNy44MTMiLz48cG9seWdvbiBmaWxsPSIjRjg5RDM1IiBwb2ludHM9IjY1LjI1IDEyMC4zNzUgODcuNzUgMTI2IDk1LjA2MyAxNTAuMTg4IDkwIDE1MyA2NS4yNSAxMzguMzc1Ii8+PHBvbHlnb24gZmlsbD0iI0VCOEYzNSIgcG9pbnRzPSI2NS4yNSAxMzguMzc1IDYwLjc1IDE3My4yNSA5MCAxNTMiLz48cG9seWdvbiBmaWxsPSIjRUE4RTNBIiBwb2ludHM9IjkyLjI1IDEwMi4zNzUgOTUuMDYzIDE1MC4xODggODYuNjI1IDEyNS43MTkiLz48cG9seWdvbiBmaWxsPSIjRDg3QzMwIiBwb2ludHM9IjM5LjM3NSAxMzguOTM4IDY1LjI1IDEzOC4zNzUgNjAuNzUgMTczLjI1Ii8+PHBvbHlnb24gZmlsbD0iI0VCOEYzNSIgcG9pbnRzPSIxMi45MzggMTg4LjQzOCA2MC43NSAxNzMuMjUgMzkuMzc1IDEzOC45MzggLjU2MyAxNDEuNzUiLz48cG9seWdvbiBmaWxsPSIjRTg4MjFFIiBwb2ludHM9Ijg4Ljg3NSA1OC41IDY0LjY4OCA3OC43NSA0Ni4xMjUgMTAxLjI1IDkyLjI1IDEwMi45MzgiLz48cG9seWdvbiBmaWxsPSIjMzkzOTM5IiBwb2ludHM9IjcwLjMxMyAxMTIuNSA2NC4xMjUgMTI1LjQzOCA4Ni4wNjMgMTE5LjgxMyIgdHJhbnNmb3JtPSJtYXRyaXgoLTEgMCAwIDEgMTUwLjE4OCAwKSIvPjxwb2x5Z29uIGZpbGw9IiNFODhGMzUiIHBvaW50cz0iMTIuMzc1IC41NjMgODguODc1IDU4LjUgNzUuOTM4IDI3Ii8+PHBhdGggZmlsbD0iIzhFNUEzMCIgZD0iTTEyLjM3NTAwMDIsMC41NjI1MDAwMDggTDIuMjUwMDAwMDMsMzEuNTAwMDAwNSBMNy44NzUwMDAxMiw2NS4yNTAwMDEgTDMuOTM3NTAwMDYsNjcuNTAwMDAxIEw5LjU2MjUwMDE0LDcyLjU2MjUgTDUuMDYyNTAwMDgsNzYuNTAwMDAxMSBMMTEuMjUsODIuMTI1MDAxMiBMNy4zMTI1MDAxMSw4NS41MDAwMDEzIEwxNi4zMTI1MDAyLDk2Ljc1MDAwMTQgTDU4LjUwMDAwMDksODMuODEyNTAxMiBDNzkuMTI1MDAxMiw2Ny4zMTI1MDA0IDg5LjI1MDAwMTMsNTguODc1MDAwMyA4OC44NzUwMDEzLDU4LjUwMDAwMDkgQzg4LjUwMDAwMTMsNTguMTI1MDAwOSA2My4wMDAwMDA5LDM4LjgxMjUwMDYgMTIuMzc1MDAwMiwwLjU2MjUwMDAwOCBaIi8+PC9nPjwvZz48L3N2Zz4="
// id: "metamask"
// isConnected: true
// metamaskProvider: "içerisi standart ethereum provider"
// name: "MetaMask"
// snap: "içerisi snap fonksiyonları starknet wallet fonk. declare, execute, signMessage, signTransaction vs"
// version: "v2.0.0"
// account: {
//   address:"starknet address, büyük iht ether adresini sn çeviriyor ya da yeni adres veriyor snap indirilip kurulduktan sonra"
//   cairoVersion: undefined
//   channel : "node rpc falan var"
//   deploySelf:"snap kurulduktan sonra hesabı deployluyor"
//   responseParser:"response parser"
//   signer: "push.5997.t.MetaMaskSigner"; {
//     getPubKey:
//     signMessage:
//     signTransaction:
//     sşgnDeployAccountTransaction:
//     signDeclareTransaction:
//     getPubKey:
//   }
//   transactionVersion:"0x2"}
// chainId: "0x534e5f4d41494e"
// selectedAddress: "starknet address, büyük iht ether adresini sn çeviriyor ya da yeni adres veriyor snap indirilip kurulduktan sonra"

//* createMetaMaskProviderWrapper enable içerisindeki accounts
// [
//   "0x023f49ca067ac9dcbb9e225aef7f9b9e26b267c81b2cc99a903bc23aeb91977a"
// ]

//! normal metamask için yeni bir createMetaMaskProviderWrapper oluştur ve onu çağır. onun içerisindeki fonksiyonlar ve elemanlar olmalı. IStarknetWindowObject e uygun olmalı. adres, isconnected vs için window.ethereum kullanılabilir

// export interface IStarknetWindowObject {
//   id: string
//   name: string
//   version: string
//   icon: string
//   request: <T extends RpcMessage>(
//     call: Omit<T, "result">,
//   ) => Promise<T["result"]>
//   enable: (options?: { starknetVersion?: "v4" | "v5" }) => Promise<string[]>
//   isPreauthorized: () => Promise<boolean>
//   on: <E extends WalletEvents>(
//     event: E["type"],
//     handleEvent: E["handler"],
//   ) => void
//   off: <E extends WalletEvents>(
//     event: E["type"],
//     handleEvent: E["handler"],
//   ) => void
//   account?: AccountInterface | AccountInterfaceV4
//   provider?: ProviderInterface | ProviderInterfaceV4
//   selectedAddress?: string
//   chainId?: string
//   isConnected: boolean
// }

function createMetaMaskProviderWrapper(
  walletInfo: WalletProvider,
  provider: unknown,
): StarknetWindowObject {
  let metaMaskSnapWallet: IStarknetWindowObject | undefined
  let fetchPromise: Promise<IStarknetWindowObject> | undefined = undefined
  const metaMaskProviderWrapper: IStarknetWindowObject = {
    id: walletInfo.id,
    name: walletInfo.name,
    icon: walletInfo.icon,
    get version() {
      return metaMaskSnapWallet?.version ?? "0.0.0"
    },
    get isConnected() {
      return metaMaskSnapWallet?.isConnected ?? false
    },
    get provider() {
      return metaMaskSnapWallet?.provider
    },
    get account() {
      return metaMaskSnapWallet?.account
    },
    get selectedAddress() {
      return metaMaskSnapWallet?.selectedAddress
    },
    get chainId() {
      return metaMaskSnapWallet?.chainId
    },
    request<T extends RpcMessage>(
      call: Omit<T, "result">,
    ): Promise<T["result"]> {
      if (!metaMaskSnapWallet) {
        throw new Error("Wallet not enabled")
      }
      return metaMaskSnapWallet.request(call)
    },
    async enable(): Promise<string[]> {
      if (!metaMaskSnapWallet) {
        fetchPromise = fetchPromise || fetchMetaMaskSnapWallet(provider)
        metaMaskSnapWallet = await fetchPromise
      }

      const accounts = await metaMaskSnapWallet!.enable()
      console.log("snapwallet", metaMaskSnapWallet)
      console.log("accounts", accounts)
      return accounts

      // const accounts = await (provider as MetaMaskProvider).request({
      //   method: "eth_requestAccounts",
      // })
      // console.log("accounts", accounts)
      // return accounts
    },
    isPreauthorized() {
      return metaMaskSnapWallet?.isPreauthorized() ?? Promise.resolve(false)
    },
    on<E extends WalletEvents>(
      event: E["type"],
      handleEvent: E["handler"],
    ): void {
      if (!metaMaskSnapWallet) {
        throw new Error("Wallet not enabled")
      }
      // @ts-ignore: Metamask currently doesn't support on method
      return metaMaskSnapWallet.on(event, handleEvent)
    },
    off<E extends WalletEvents>(event: E["type"], handleEvent: E["handler"]) {
      if (!metaMaskSnapWallet) {
        throw new Error("Wallet not enabled")
      }
      // @ts-ignore: Metamask currently doesn't support off method
      return metaMaskSnapWallet.off(event, handleEvent)
    },
  }

  return metaMaskProviderWrapper as StarknetWindowObject
}

//TODO: yeni window objesi oluşturulduğunda injectMetamaskBridge fonksiyonu çağrılacak fakat starknet_metamask ve wallet.id bizimki olacak

async function injectMetamaskBridge(windowObject: Record<string, unknown>) {
  if (windowObject.hasOwnProperty("starknet_metamask")) {
    return
  }

  const metamaskWalletInfo = wallets.find(
    (wallet) => wallet.id === "metamaskRosetta",
  )

  if (!metamaskWalletInfo) {
    return
  }

  const provider = await detectMetamaskSupport(windowObject)
  if (!provider) {
    return
  }

  //TODO: burada snapli mi snapsiz mi bağlantı if koyup hangisine göre bu fonksiyonda createMetaMaskProviderWrapper(), enable() çağırıcağımızı belirleyeceğiz.
  windowObject.starknet_metamask = createMetaMaskProviderWrapper(
    metamaskWalletInfo,
    provider,
  )
}

// async function connectMetamaskBridge(
//   windowObject: Record<string, unknown>,
//   selectedWallet: string,
// ) {
//   const metamaskWalletInfo = wallets.find(
//     (wallet) => wallet.id === selectedWallet,
//   )

//   console.log(selectedWallet)

//   if (!metamaskWalletInfo) {
//     return
//   }

//   const provider = await detectMetamaskSupport(windowObject)
//   if (!provider) {
//     return
//   }

//   //TODO: burada snapli mi snapsiz mi bağlantı if koyup hangisine göre bu fonksiyonda createMetaMaskProviderWrapper(), enable() çağırıcağımızı belirleyeceğiz.

//   windowObject.starknet_metamask = createMetaMaskProviderWrapper(
//     metamaskWalletInfo,
//     provider,
//   )
// }

export { injectMetamaskBridge }
