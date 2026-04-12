using System.ComponentModel;
using System.Net;

using Syncfusion.Windows.PropertyGrid;

namespace SyncfusionWpfApp1
{
    public class Bank
    {
        [DisplayNameAttribute("Name")]
        [DescriptionAttribute("Name of the bank.")]
        public string Name
        {
            get;
            set;
        }

        [DisplayNameAttribute("Customer ID")]
        [DescriptionAttribute("Customer ID used for Net Banking.")]
        public string CustomerID
        {
            get;

            set;
        }

        [DescriptionAttribute("Password used for Net Banking.")]
        [ReadOnly(true)]
        public string Password
        {
            get;

            set;
        }

        [DisplayNameAttribute("Account Number")]
        [DescriptionAttribute("Bank Account Number.")]
        public long AccountNumber
        {
            get;

            set;
        }


        [DescriptionAttribute("Address of Bank.")]
        [ReadOnly(true)]
        public Address Address
        {
            get;

            set;
        }
        public override string ToString()
        {
            return Name;
        }
    }

    public enum Gender
    {
        Male,

        Female
    }

    public enum Country
    {
        USA,

        Germany,

        Canada,

        Mexico,

        Alaska,

        Japan,

        China,

        Peru,

        Chile,

        Argentina,

        Brazil

    }
}
