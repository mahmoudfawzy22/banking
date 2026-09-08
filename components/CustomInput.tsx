import React from "react";
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "./ui/form";
import { formSchema as authFormSchema } from "@/lib/utils";
import { Input } from "./ui/input";
import { Control, FieldPath } from "react-hook-form";
import z from "zod";
const formSchema = authFormSchema("sign-up");
interface CustomInput {
  control: Control<z.infer<typeof formSchema>>;
  name: FieldPath<z.infer<typeof formSchema>>;
  label: string;
  placeholder: string;
}
function CustomInput({ control, placeholder, label, name }: CustomInput) {
  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem className="form-item">
          <FormLabel className="form-label">{label}</FormLabel>
          <div className="flex flex-col w-full">
            <FormControl>
              <Input
                placeholder={placeholder}
                className="input-class"
                {...field}
                type={name === "password" ? "password" : "text"}
              />
            </FormControl>
            <FormMessage className="form-message mt-2" />
          </div>
        </FormItem>
      )}
    />
  );
}

export default CustomInput;
