import { createContext, ReactNode, useContext, useState } from 'react';
import { toast } from 'react-toastify';
import { api } from '../services/api';
import { Product, Stock } from '../types';

interface CartProviderProps {
  children: ReactNode;
}

interface UpdateProductAmount {
  productId: number;
  amount: number;
}

interface CartContextData {
  cart: Product[];
  addProduct: (productId: number) => Promise<void>;
  removeProduct: (productId: number) => void;
  updateProductAmount: ({ productId, amount }: UpdateProductAmount) => void;
}

const CartContext = createContext<CartContextData>({} as CartContextData);

export function CartProvider({ children }: CartProviderProps): JSX.Element {
  const [cart, setCart] = useState<Product[]>(() => {
    return JSON.parse(localStorage.getItem('@RocketShoes:cart') || '[]');
  });

  const addProduct = async (productId: number) => {
    try {
      const productsInStock = await api.get('/stock').then<Stock[]>(response => response.data);
      
      const product = (await api.get('/products')
        .then<Product[]>(response => response.data))
        .find(p => p.id === productId);

      if(product) {
        const productInStock = productsInStock.find(item => item.id === product.id) 
        if(productInStock) {
          if(cart.find(item => item.id === productId)) {
            const newCart = cart.map(item => {
              if(item.id === productId) {
                if(!item.amount) {
                  item.amount = 0;
                }

                if(item.amount + 1 > productInStock.amount) {
                  toast.error('Quantidade solicitada fora de estoque');
                }else {
                  item.amount += 1;
                  return item;
                }
              }
              return item;
            });

            setCart(newCart);
            localStorage.setItem('@RocketShoes:cart', JSON.stringify(newCart));

          } else {
            setCart([...cart, {...product, amount: 1}]);
            localStorage.setItem('@RocketShoes:cart', JSON.stringify([...cart, {...product, amount: 1}]));
          }
        } else {
          throw new Error('Product does not exists in stock');
        }
      } else {
        throw new Error('Product does not exists');
      }

    } catch {
      toast.error('Erro na adição do produto');
    }
  };

  const removeProduct = (productId: number) => {
    try {
      const product = cart.find(item => item.id === productId);

      if(product) {
        
        const productIndex = cart.findIndex(item => productId === item.id);
        
        cart.splice(productIndex,1);
  
        setCart([...cart]);
        localStorage.setItem('@RocketShoes:cart', JSON.stringify([...cart]));
        
      } else {
        throw new Error('Product does not exists');
      }
    } catch {
      toast.error('Erro na remoção do produto');
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    try {
      const productsInStock = await api.get('/stock').then<Stock[]>(response => response.data);
      const productInStock = productsInStock.find(item => item.id === productId) 

      if(productInStock) {
        const updatedCart = cart.map(item => {
          if(item.id === productId) {

            if(amount > productInStock.amount) {
              toast.error('Quantidade solicitada fora de estoque');
            }else {
              item.amount = amount;
              return item;
            }

          }
          return item;
        })
        setCart(updatedCart);
        localStorage.setItem('@RocketShoes:cart', JSON.stringify(updatedCart));
      }
    } catch {
      toast.error('Erro na alteração de quantidade do produto');
    }
  };

  return (
    <CartContext.Provider
      value={{ cart, addProduct, removeProduct, updateProductAmount }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextData {
  const context = useContext(CartContext);

  return context;
}
