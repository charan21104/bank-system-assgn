def to_indian_format(number_val):
    num_str = str(number_val)
    
    if '.' in num_str:
        integer_part, fractional_part = num_str.split('.')
    else:
        integer_part, fractional_part = num_str, None

    if len(integer_part) <= 3:
        formatted_integer = integer_part
    else:
        last_three_digits = integer_part[-3:]
        remaining_digits = integer_part[:-3]
        
        reversed_remaining = remaining_digits[::-1]
        groups = [reversed_remaining[i:i+2] for i in range(0, len(reversed_remaining), 2)]
        formatted_remaining = ','.join(groups)[::-1]
        
        formatted_integer = f"{formatted_remaining},{last_three_digits}"

    if fractional_part:
        return f"{formatted_integer}.{fractional_part}"
    else:
        return formatted_integer

def main():
    print("--- Indian Currency Formatter ---")
    try:
        user_input = input("Enter a number to format: ")
        number_to_format = float(user_input)
        formatted_string = to_indian_format(number_to_format)
        print(f"Formatted number: {formatted_string}")
    except ValueError:
        print("Invalid input. Please enter a valid number.")
    except Exception as e:
        print(f"An error occurred: {e}")

if __name__ == "__main__":
    main()
