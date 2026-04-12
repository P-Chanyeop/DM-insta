using System;
using System.Collections.Generic;
using System.Collections.ObjectModel;

using SyncfusionWpfApp1.Contracts.Services;
using SyncfusionWpfApp1.Helpers;
using SyncfusionWpfApp1.Models;

namespace SyncfusionWpfApp1.ViewModels
{
    public class DockingManagerViewModel : Observable
    {
		private bool useDocumentContainer;

        public bool UseDocumentContainer
        {
            get { return useDocumentContainer; }
            set { useDocumentContainer = value; }
        }

        private bool enableMaximizeButton;

        public bool EnableMaximizeButton
        {
            get { return enableMaximizeButton; }
            set { enableMaximizeButton = value; }
        }


        private bool enableMinimizeButton;

        public bool EnableMinimizeButton
        {
            get { return enableMinimizeButton; }
            set { enableMinimizeButton = value; }
        }


        public DockingManagerViewModel()
        {
            UseDocumentContainer = true;
            EnableMaximizeButton = true;
            EnableMinimizeButton = true;
        }
	}
}
