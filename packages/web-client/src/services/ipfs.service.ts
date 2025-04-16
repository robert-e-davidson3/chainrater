export class IPFSService {
  ipfsGateway: string = 'https://ipfs.io/ipfs/';
  
  // This will handle the URI mapping
  async getURIMapping(ipfsHash: string): Promise<Map<string, string>> {
    try {
      const response = await fetch(`${this.ipfsGateway}${ipfsHash}`);
      if (!response.ok) {
        throw new Error(`Failed to fetch URI mapping: ${response.statusText}`);
      }
      
      const data = await response.json();
      
      // Convert data to a Map of uriHash => decodedURI
      const mapping = new Map<string, string>();
      for (const [key, value] of Object.entries(data)) {
        mapping.set(key, value as string);
      }
      
      return mapping;
    } catch (error) {
      console.error('Failed to fetch URI mapping from IPFS:', error);
      return new Map();
    }
  }
  
  // Resolve a URI hash to its decoded form
  async resolveURIHash(uriHash: string, mappingCID: string): Promise<string | null> {
    try {
      const mapping = await this.getURIMapping(mappingCID);
      return mapping.get(uriHash) || null;
    } catch (error) {
      console.error('Error resolving URI hash:', error);
      return null;
    }
  }
}