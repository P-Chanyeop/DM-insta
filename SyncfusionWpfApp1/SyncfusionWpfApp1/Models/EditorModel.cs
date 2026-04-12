using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using System.Windows.Media;

using Syncfusion.Windows.Edit;

namespace SyncfusionWpfApp1.Model
{
    

    /// <summary>

    /// Business object implemented from IIntelliSenseItem interface in 

    /// Syncfusion.Windows.Edit namespace

    /// </summary>

    public class CustomIntelliSenseItem : IIntellisenseItem

    {



        /// <summary>

        /// Gets or sets a value indicating Icon to be displayed in the IntelliSenseListBox

        /// </summary>

        public ImageSource Icon

        {

            get;

            set;

        }

        /// <summary>

        /// Gets or sets a value indicating Text to be displayed in the IntelliSenseListBox

        /// </summary>

        public string Text

        {

            get;

            set;

        }

        /// <summary>

        /// Gets or sets a collection of sub-items to be displayed

        /// </summary>

        public IEnumerable<IIntellisenseItem> NestedItems

        {

            get;

            set;

        }


    }
}
