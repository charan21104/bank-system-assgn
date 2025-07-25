def perform_shift(text, key):
    
    result = ""
    for char in text:
        if 'a' <= char <= 'z':
            start = ord('a')
            new_char_code = (ord(char) - start + key) % 26 + start
            result += chr(new_char_code)
        elif 'A' <= char <= 'Z':
            start = ord('A')
            new_char_code = (ord(char) - start + key) % 26 + start
            result += chr(new_char_code)
        else:
            result += char
    return result

def caesar_encode(message, shift):

    return perform_shift(message, shift)

def caesar_decode(encoded_message, shift):
   
    return perform_shift(encoded_message, -shift)

def main():
    
    
    try:
        message_to_process = input("Enter the message: ")
        shift_key = int(input("Enter the shift key (a number): "))

        encoded_version = caesar_encode(message_to_process, shift_key)
        print(f"\nEncoded: {encoded_version}")

        decoded_version = caesar_decode(encoded_version, shift_key)
        print(f"Decoded back: {decoded_version}")

    except ValueError:
        print("\nInvalid input. The shift key must be a whole number.")
    except Exception as e:
        print(f"\nAn error occurred: {e}")

if __name__ == "__main__":
    main()
