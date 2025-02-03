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

  console.log("MetaMaskSnapWallet-1", MetaMaskSnapWallet)

  const metaMaskSnapWallet = new MetaMaskSnapWallet(provider, "*")

  console.log("MetaMaskSnapWallet-2", MetaMaskSnapWallet)
  return metaMaskSnapWallet as IStarknetWindowObject
}

// TODO: Üstteki Metamask snap wallet gibi bir fonksiyon yazılacak ve ya result as {MetaMaskSnapWallet: any, MetaMaskSnap: any} gibi atama yapılması gerekiyor. result as {metamaskaccount, metamasksigner} olabilir

// Bu metamaskAccount
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

// Bu metamask snap wallet
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
      return accounts
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

  const metamaskWalletInfo = wallets.find((wallet) => wallet.id === "metamask")

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
