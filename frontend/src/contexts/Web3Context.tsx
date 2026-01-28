import React, { createContext, useContext, useEffect, useState } from 'react';
import { BrowserProvider, Signer } from 'ethers';
import { toast } from 'sonner';

interface Web3ContextType {
  address: string | null;
  isConnected: boolean;
  isConnecting: boolean;
  isSigning: boolean;
  signer: Signer | null;
  connect: () => Promise<void>;
  disconnect: () => void;
  signMessage: (message: string) => Promise<string | null>;
}

const Web3Context = createContext<Web3ContextType | undefined>(undefined);

export const Web3Provider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [address, setAddress] = useState<string | null>(null);
  const [signer, setSigner] = useState<Signer | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isSigning, setIsSigning] = useState(false);

  // 1. AUTO-DETECT ON LOAD using BrowserProvider
  useEffect(() => {
    const checkConnection = async () => {
      if (typeof window !== 'undefined' && (window as any).ethereum) {
        try {
          const provider = new BrowserProvider((window as any).ethereum);
          const accounts = await provider.send("eth_accounts", []);
          if (accounts.length > 0) {
            const signerInstance = await provider.getSigner();
            setAddress(accounts[0]);
            setSigner(signerInstance);
          }
        } catch (error) {
          console.error("Error checking wallet connection:", error);
        }
      }
    };

    checkConnection();

    // 2. LISTEN FOR ACCOUNT CHANGES (User switches wallet in MetaMask)
    if ((window as any).ethereum) {
      (window as any).ethereum.on('accountsChanged', async (accounts: string[]) => {
        if (accounts.length > 0) {
          const provider = new BrowserProvider((window as any).ethereum);
          const signerInstance = await provider.getSigner();
          setAddress(accounts[0]);
          setSigner(signerInstance);
        } else {
          setAddress(null);
          setSigner(null);
          toast.info("Wallet disconnected");
        }
      });
    }

    return () => {
      // Cleanup listener if needed
      if ((window as any).ethereum && (window as any).ethereum.removeListener) {
        (window as any).ethereum.removeListener('accountsChanged', () => {});
      }
    };
  }, []);

  const connect = async () => {
    if (typeof window === 'undefined' || !(window as any).ethereum) {
      toast.error('MetaMask is not installed!');
      return;
    }

    setIsConnecting(true);
    try {
      // Use BrowserProvider approach as requested
      const provider = new BrowserProvider((window as any).ethereum);
      await provider.send("eth_requestAccounts", []);
      const signerInstance = await provider.getSigner();
      const userAddress = await signerInstance.getAddress();
      
      setAddress(userAddress);
      setSigner(signerInstance);
      toast.success('Wallet connected successfully');
    } catch (error: any) {
      toast.error(error.message || 'Failed to connect wallet');
    } finally {
      setIsConnecting(false);
    }
  };

  const disconnect = () => {
    setAddress(null);
    setSigner(null);
    toast.info('Wallet disconnected');
  };

  const signMessage = async (message: string): Promise<string | null> => {
    if (!address || !signer) {
      toast.error("Wallet not connected");
      return null;
    }
    
    setIsSigning(true);
    try {
      const signature = await signer.signMessage(message);
      return signature;
    } catch (error: any) {
      console.error("Signing error:", error);
      toast.error("User denied message signature");
      return null;
    } finally {
      setIsSigning(false);
    }
  };

  return (
    <Web3Context.Provider value={{ 
      address, 
      isConnected: !!address, 
      isConnecting, 
      isSigning,
      signer,
      connect, 
      disconnect,
      signMessage 
    }}>
      {children}
    </Web3Context.Provider>
  );
};

export const useWeb3 = () => {
  const context = useContext(Web3Context);
  if (context === undefined) {
    throw new Error('useWeb3 must be used within a Web3Provider');
  }
  return context;
};